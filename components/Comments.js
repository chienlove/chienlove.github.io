// components/Comments.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, where,
  arrayUnion, arrayRemove, increment,
  getDocs, startAfter, writeBatch
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faReply, faTrash, faUserCircle, faHeart, faArrowUp
} from '@fortawesome/free-solid-svg-icons';

/* ================= Helpers ================= */
function preferredName(user) {
  if (!user) return 'Người dùng';
  const p0 = user.providerData?.[0];
  return user.displayName || user.email || p0?.displayName || p0?.email || 'Người dùng';
}
function preferredPhoto(user) {
  return user?.photoURL || user?.providerData?.[0]?.photoURL || '';
}
function formatDate(ts) {
  try {
    let d = null;
    if (!ts) return '';
    if (ts?.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === 'number') d = new Date(ts);
    else if (typeof ts === 'string') d = new Date(ts);
    else if (ts instanceof Date) d = ts;
    if (!d) return '';
    const diff = (Date.now() - d.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
    for (const [unit, sec] of units) {
      if (Math.abs(diff) >= sec || unit === 'second') {
        const val = Math.round(diff / sec * -1);
        return { rel: rtf.format(val, unit), abs: d.toLocaleString('vi-VN') };
      }
    }
    return { rel: '', abs: d.toLocaleString('vi-VN') };
  } catch { return ''; }
}
function excerpt(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/* ================= Notifications ================= */
// ❗️Chỉ bump counter cho CHÍNH MÌNH (tránh permission-denied khi đụng doc của người khác)
async function bumpCounter(uid, delta) {
  if (!uid || !Number.isFinite(delta)) return;
  if (auth.currentUser?.uid !== uid) return; // chặn bump chéo user
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(ref, { unreadCount: Math.max(0, cur + delta), updatedAt: serverTimestamp() }, { merge: true });
  });
}
async function createNotification(payload = {}) {
  const { toUserId, type, postId, commentId, fromUserId, ...extra } = payload;
  if (!toUserId) return;
  await addDoc(collection(db, 'notifications'), {
    toUserId,
    type, // 'comment' | 'reply' | 'like'
    postId,
    commentId,
    isRead: false,
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
    fromUserId,
    ...extra,
  });
}

/** Gộp thông báo LIKE theo (toUserId, postId, commentId) -- KHÔNG đọc doc */
async function upsertLikeNotification({
  toUserId, postId, commentId,
  fromUserId, fromUserName, fromUserPhoto,
  postTitle = '', commentText = ''
}) {
  if (!toUserId || !postId || !commentId) return;
  const nid = `like_${toUserId}_${postId}_${commentId}`;
  const ref = doc(db, 'notifications', nid);

  // 1) Cố gắng UPDATE "mù" (nếu tồn tại thì tăng đếm)
  try {
    await updateDoc(ref, {
      toUserId,
      type: 'like',
      postId: String(postId),
      commentId,
      isRead: false,                   // "đánh thức" thông báo
      updatedAt: serverTimestamp(),
      lastLikerName: fromUserName || 'Ai đó',
      lastLikerPhoto: fromUserPhoto || '',
      postTitle,
      commentText,
      count: increment(1),
      likers: arrayUnion(fromUserId),
    });
    return;
  } catch (_) {
    // NOT_FOUND -> đi tạo mới
  }

  // 2) Nếu chưa có: SET tạo mới (không cần đọc trước)
  await setDoc(ref, {
    toUserId,
    type: 'like',
    postId: String(postId),
    commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    fromUserId, fromUserName, fromUserPhoto,
    lastLikerName: fromUserName || 'Ai đó',
    lastLikerPhoto: fromUserPhoto || '',
    postTitle,
    commentText,
    count: 1,
    likers: [fromUserId],
  }, { merge: true });
}

/* ================= Users bootstrap ================= */
async function ensureUserDoc(u) {
  if (!u) return;
  const uref = doc(db, 'users', u.uid);
  const snap = await getDoc(uref);
  const base = {
    uid: u.uid,
    email: u.email || '',
    displayName: preferredName(u),
    photoURL: preferredPhoto(u),
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) {
    await setDoc(uref, { ...base, createdAt: serverTimestamp(), stats: { comments: 0, likesReceived: 0 } }, { merge: true });
  } else {
    await setDoc(uref, base, { merge: true });
  }
}

/* ================= UI bits ================= */
const VerifiedBadgeX = ({ className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`inline-block ${className}`} fill="#1d9bf0">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

function ActionBar({ hasLiked, likeCount, onToggleLike, renderReplyTrigger }) {
  return (
    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <button
        onClick={onToggleLike}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors
          ${hasLiked 
            ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30 dark:hover:bg-rose-900/40' 
            : 'text-gray-600 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-300 dark:hover:text-rose-300 dark:hover:bg-rose-900/20'
          }`}
        title={hasLiked ? 'Bỏ thích' : 'Thích'}
      >
        <FontAwesomeIcon icon={faHeart} />
        {likeCount > 0 && <span>{likeCount}</span>}
      </button>

      {renderReplyTrigger?.()}
    </div>
  );
}

function CommentHeader({ c, me, isAdminFn, dt, canDelete, onDelete }) {
  const isAdmin = isAdminFn?.(c.authorId);
  const isSelf = !!me && c.authorId === me.uid;
  const avatar = c.userPhoto || '';
  const userName = c.userName || 'Người dùng';

  const NameLink = ({ uid, children }) => {
    if (!uid) return <span className="font-semibold text-sky-700 dark:text-sky-300">{children}</span>;
    const href = isSelf ? '/profile' : `/users/${uid}`;
    return (
      <Link href={href} className="font-semibold text-sky-700 dark:text-sky-300 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors">
        {children}
      </Link>
    );
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900/40">
        {avatar ? (
          <img src={avatar} alt="avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6 text-sky-500" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <NameLink uid={c.authorId}>{userName}</NameLink>
          {isAdmin && <span className="inline-flex items-center justify-center translate-y-[0.5px]" title="Quản trị viên đã xác minh"><VerifiedBadgeX className="w-4 h-4 shrink-0" /></span>}
          <span className="text-xs text-gray-500 dark:text-gray-400" title={dt?.abs}>{dt?.rel}</span>
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-rose-600 hover:text-rose-700 ml-auto inline-flex items-center gap-1" title="Xoá">
              <FontAwesomeIcon icon={faTrash} />
              Xoá
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Quote({ quoteFrom, me }) {
  if (!quoteFrom) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-orange-600 dark:text-orange-400">
        {quoteFrom.authorId ? (
          <Link href={me && quoteFrom.authorId === me.uid ? '/profile' : `/users/${quoteFrom.authorId}`} className="flex items-center gap-1 hover:underline">
            <span>{quoteFrom.userName || 'Người dùng'}</span>
            <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3 translate-y-[1px]" />
          </Link>
        ) : (
          <span className="flex items-center gap-1">
            <span>{quoteFrom.userName || 'Người dùng'}</span>
            <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3 translate-y-[1px]" />
          </span>
        )}
        <span className="text-gray-600 dark:text-gray-300">said:</span>
      </div>
      <div className="p-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 whitespace-pre-wrap break-words">
        {excerpt(quoteFrom.content, 200)}
      </div>
    </div>
  );
}

/* ================= ReplyBox ================= */
function ReplyBox({
  me, postId, parent, replyingTo = null, adminUids, postTitle,
  onNeedVerify, onNeedLogin,
  renderTrigger
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const target = replyingTo || parent;
  const canReply = !!me && me.uid !== (target?.authorId ?? '');

  const tryOpen = () => {
    if (!me) { onNeedLogin?.(); return; }
    if (!me.emailVerified) { onNeedVerify?.(); return; }
    setOpen(true);
  };

  const onReply = async (e) => {
    e.preventDefault();
    if (!me) { onNeedLogin?.(); return; }
    if (!me.emailVerified) { onNeedVerify?.(); return; }
    if (!canReply || !text.trim() || sending) return;

    setSending(true);
    try {
      await ensureUserDoc(me);
      const ref = await addDoc(collection(db, 'comments'), {
        postId: String(postId),
        parentId: parent.id,
        authorId: me.uid,
        userName: preferredName(me),
        userPhoto: preferredPhoto(me),
        content: text.trim(),
        createdAt: serverTimestamp(),
        replyToUserId: target.authorId || null,
        likeCount: 0,
        likedBy: []
      });
      setText(''); setOpen(false);
      await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) });

      if (target.authorId && target.authorId !== me.uid) {
        await createNotification({
          toUserId: target.authorId,
          type: 'reply',
          postId: String(postId),
          commentId: ref.id,
          fromUserId: me.uid,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle || '',
          commentText: excerpt(text),
        });
        // Không bump counter của người khác
      }

      const targets = adminUids.filter(u => u !== me.uid && u !== target.authorId);
      await Promise.all(targets.map(async (uid) => {
        await createNotification({
          toUserId: uid,
          type: 'comment',
          postId: String(postId),
          commentId: ref.id,
          fromUserId: me.uid,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle || '',
          commentText: excerpt(text),
        });
        // Không bump counter của người khác
      }));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (renderTrigger ? renderTrigger(tryOpen) : (
        <button onClick={tryOpen} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ))}

      {open && (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          {target && (
            <div className="overflow-hidden rounded-lg border border-gray-300 dark:border-gray-600">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 text-sm font-semibold text-orange-600 dark:text-orange-400">
                {target.authorId ? (
                  <Link href={me && target.authorId === me.uid ? '/profile' : `/users/${target.authorId}`} className="flex items-center gap-1 hover:underline">
                    <span>{target.userName || 'Người dùng'}</span>
                    <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3 translate-y-[1px]" />
                  </Link>
                ) : (
                  <span className="flex items-center gap-1">
                    <span>{target.userName || 'Người dùng'}</span>
                    <FontAwesomeIcon icon={faArrowUp} className="w-3 h-3 translate-y-[1px]" />
                  </span>
                )}
                <span className="text-gray-600 dark:text-gray-300">said:</span>
              </div>
              <div className="p-3 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-t border-gray-300 dark:border-gray-600 whitespace-pre-wrap break-words">
                {excerpt(target.content, 200)}
              </div>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[72px] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none shadow-sm"
            placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName || 'người dùng') : (parent.userName || 'người dùng')}…`}
            maxLength={2000}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setOpen(false); setText(''); }} className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Huỷ</button>
            <button type="submit" disabled={!text.trim() || sending} className={`px-4 py-2 text-sm rounded-xl inline-flex items-center gap-2 text-white ${!text.trim() || sending ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
              {sending ? 'Đang gửi…' : 'Gửi'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

/* ================= Main ================= */
export default function Comments({ postId, postTitle }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [content, setContent] = useState('');

  const PAGE_SIZE = 50;
  const [liveItems, setLiveItems] = useState([]);
  const [olderItems, setOlderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastDocRef = useRef(null);
  const unsubRef = useRef(null);
  const [hasMore, setHasMore] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  const [likingIds, setLikingIds] = useState(() => new Set());
  const [threadsToExpand, setThreadsToExpand] = useState(new Set());

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'admins'));
        if (snap.exists()) {
          const arr = Array.isArray(snap.data().uids) ? snap.data().uids : [];
          setAdminUids(arr);
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setOlderItems([]);
    setHasMore(false);
    lastDocRef.current = null;
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    const q = query(
      collection(db, 'comments'),
      where('postId', '==', String(postId)),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLiveItems(list);
      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = lastVisible;
      setHasMore(!!lastVisible);
      setLoading(false);
    });
    unsubRef.current = unsub;
    return () => { if (unsubRef.current) unsubRef.current(); unsubRef.current = null; };
  }, [postId]);

  useEffect(() => {
    if (!me || liveItems.length === 0) return;
    const fixes = liveItems
      .filter(c => c.authorId === me.uid && (!c.userName || !c.userPhoto))
      .map(c => updateDoc(doc(db, 'comments', c.id), {
        userName: c.userName || preferredName(me),
        userPhoto: c.userPhoto || preferredPhoto(me)
      }).catch(()=>{}));
    if (fixes.length) Promise.all(fixes).catch(()=>{});
  }, [me, liveItems]);

  const items = useMemo(() => [...liveItems, ...olderItems], [liveItems, olderItems]);

  const roots = useMemo(() => items.filter(c => !c.parentId), [items]);
  const repliesByParent = useMemo(() => {
    const m = {};
    items.forEach(c => { if (c.parentId) (m[c.parentId] ||= []).push(c); });
    Object.values(m).forEach(arr => arr.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)));
    return m;
  }, [items]);
  
  const loadMore = async () => {
    if (!postId || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', String(postId)),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOlderItems(prev => [...prev, ...list]);
      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = lastVisible;
      setHasMore(!!lastVisible);
    } finally {
      setLoadingMore(false);
    }
  };

  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me) { setModalOpen(true); setModalTitle('Cần đăng nhập'); setModalContent(<p>Hãy đăng nhập để bình luận.</p>); setModalActions(null); return; }
    if (!me.emailVerified) { setModalOpen(true); setModalTitle('Cần xác minh email'); setModalContent(<p>Vui lòng xác minh email để bình luận.</p>); setModalActions(null); return; }
    if (!content.trim() || submitting) return;

    setSubmitting(true);
    try {
      await ensureUserDoc(me);
      const payload = {
        postId: String(postId),
        parentId: null,
        authorId: me.uid,
        userName: preferredName(me),
        userPhoto: preferredPhoto(me),
        content: content.trim(),
        createdAt: serverTimestamp(),
        replyToUserId: null,
        likeCount: 0,
        likedBy: []
      };
      const ref = await addDoc(collection(db, 'comments'), payload);
      setContent('');
      await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) });

      // Thông báo cho admin (nếu có), không bump counter chéo user
      const targetAdmins = adminUids.filter(u => u !== me.uid);
      await Promise.all(targetAdmins.map(async (uid) => {
        await createNotification({
          toUserId: uid,
          type: 'comment',
          postId: String(postId),
          commentId: ref.id,
          fromUserId: me.uid,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle || '',
          commentText: excerpt(payload.content),
        });
      }));
    } finally { setSubmitting(false); }
  };

  const toggleLike = async (c) => {
    if (!me) { setModalOpen(true); setModalTitle('Cần đăng nhập'); setModalContent(<p>Hãy đăng nhập để thích bình luận.</p>); setModalActions(null); return; }
    if (likingIds.has(c.id)) return;
    const next = new Set(likingIds); next.add(c.id); setLikingIds(next);
    const ref = doc(db, 'comments', c.id);
    const hasLiked = Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
    try {
      await updateDoc(ref, {
        likedBy: hasLiked ? arrayRemove(me.uid) : arrayUnion(me.uid),
        likeCount: increment(hasLiked ? -1 : +1),
      });
      if (c.authorId) {
        await updateDoc(doc(db, 'users', c.authorId), { 'stats.likesReceived': increment(hasLiked ? -1 : +1) });
      }

      // ✅ Chỉ khi LIKE (không phải UNLIKE) thì upsert thông báo gộp -- và KHÔNG bump counter chéo user
      if (!hasLiked && me.uid !== c.authorId) {
        await upsertLikeNotification({
          toUserId: c.authorId,
          postId: String(c.postId),
          commentId: c.id,
          fromUserId: me.uid,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle || '',
          commentText: excerpt(c.content, 160),
        });
      }
    } finally {
      const out = new Set(likingIds); out.delete(c.id); setLikingIds(out);
    }
  };

  const deleteThreadBatch = async (root) => {
    const toDelete = [root, ...(repliesByParent[root.id] || [])];
    const batch = writeBatch(db);
    const authorsToUpdate = new Set(toDelete.map(c => c.authorId).filter(Boolean));
    const existingAuthorIds = new Set();
    const authorSnaps = await Promise.all([...authorsToUpdate].map(uid => getDoc(doc(db, 'users', uid))));
    authorSnaps.forEach(snap => { if (snap.exists()) existingAuthorIds.add(snap.id); });

    toDelete.forEach((it) => {
      batch.delete(doc(db, 'comments', it.id));
      if (it.authorId && existingAuthorIds.has(it.authorId)) {
        batch.update(doc(db, 'users', it.authorId), { 'stats.comments': increment(-1) });
      }
    });
    await batch.commit();
  };

  const deleteSingleComment = async (r) => {
    try {
      await deleteDoc(doc(db, 'comments', r.id));
      const authorSnap = await getDoc(doc(db, 'users', r.authorId));
      if (authorSnap.exists()) {
        await updateDoc(doc(db, 'users', r.authorId), { 'stats.comments': increment(-1) });
      }
    } catch (error) {
      console.error("Lỗi khi xóa bình luận:", error);
    }
  };

  // Logic cuộn đến bình luận khi truy cập từ thông báo
  useEffect(() => {
    const scrollToComment = () => {
      const targetId = router.query.comment;
      if (targetId && items.length > 0) {
        const targetComment = items.find(c => c.id === targetId);
        if (targetComment) {
          const rootParentId = targetComment.parentId || targetComment.id;
          setThreadsToExpand(prev => new Set(prev).add(rootParentId));
          setTimeout(() => {
            const el = document.getElementById(`c-${targetId}`);
            if (el) {
              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              el.style.transition = 'background-color 0.5s';
              el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
              setTimeout(() => { el.style.backgroundColor = ''; }, 2000);
            }
          }, 500);
        }
      }
    };
    if (router.isReady && items.length > 0) scrollToComment();
  }, [router.isReady, items, router.query.comment]);

  return (
    <div className="mt-6">
      {/* (Bạn có thể thay modal "gọn nhẹ" của riêng app nếu muốn) */}
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Bình luận</h3>

      {!me ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Hãy đăng nhập để bình luận.</div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[96px] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500/40 outline-none shadow-sm"
            placeholder="Viết bình luận..."
            maxLength={3000}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting || !content.trim()}
              className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 text-white shadow-sm
                ${submitting || !content.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 active:scale-95'}`}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              {submitting ? 'Đang gửi…' : 'Gửi'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải bình luận…</div>
        ) : roots.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Chưa có bình luận.</div>
        ) : (
          <>
            <ul className="space-y-4">
              {roots.map((c) => (
                <RootComment
                  key={c.id}
                  c={c}
                  replies={repliesByParent[c.id] || []}
                  me={me}
                  adminUids={adminUids}
                  postId={postId}
                  postTitle={postTitle}
                  onOpenConfirm={(msg, fn)=>{ if (confirm(msg)) fn(); }}
                  toggleLike={toggleLike}
                  deleteSingleComment={deleteSingleComment}
                  deleteThreadBatch={deleteThreadBatch}
                  initialShowReplies={threadsToExpand.has(c.id)}
                />
              ))}
            </ul>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className={`px-4 py-2 rounded-xl border inline-flex items-center justify-center
                    ${loadingMore
                      ? 'text-gray-500 border-gray-300 cursor-not-allowed'
                      : 'text-sky-700 border-sky-200 hover:bg-sky-50 dark:text-sky-300 dark:border-sky-700 dark:hover:bg-sky-900/20'
                    }`}
                >
                  {loadingMore ? 'Đang tải…' : 'Xem thêm bình luận cũ'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}