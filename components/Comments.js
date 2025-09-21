// components/Comments.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, where,
  arrayUnion, arrayRemove, increment,
  getDocs, startAfter
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faReply, faTrash, faUserCircle, faHeart, faArrowUp } from '@fortawesome/free-solid-svg-icons';

/* ============ Helpers ============ */
function preferredName(user) {
  if (!user) return 'Người dùng';
  const p0 = user.providerData?.[0];
  return user.displayName || user.email || p0?.displayName || p0?.email || 'Người dùng';
}
function preferredPhoto(user) {
  return user?.photoURL || user?.providerData?.[0]?.photoURL || '';
}
function excerpt(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
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

/* ============ Users bootstrap ============ */
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

/* ============ Notifications ============ */
// Chỉ cập nhật counter cho chính mình để tránh permission-denied theo rules user_counters.
async function bumpCounter(uid, delta) {
  if (!uid || !Number.isFinite(delta)) return;
  if (auth.currentUser?.uid !== uid) return; // không bump chéo user
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(ref, { unreadCount: Math.max(0, cur + delta), updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Tạo thông báo thường: dùng addDoc (mỗi sự kiện một doc)
async function createNotification(payload = {}) {
  const { toUserId, type, postId, commentId, fromUserId, ...extra } = payload;
  if (!toUserId || !fromUserId) return;
  await addDoc(collection(db, 'notifications'), {
    toUserId,
    fromUserId,
    type, // 'comment' | 'reply' | 'like'
    postId: String(postId || ''),
    commentId: commentId || null,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...extra,
  });
}

// Upsert thông báo LIKE gộp theo (toUserId, postId, commentId).
// LUÔN set fromUserId trong cả update lẫn set để thỏa Firestore Rules của bạn.  [oai_citation:3‡Comments.js](file-service://file-Byk1Yf1AZLt7y5yKgG5weQ)
async function upsertLikeNotification({
  toUserId, postId, commentId,
  fromUserId, fromUserName, fromUserPhoto,
  postTitle = '', commentText = ''
}) {
  if (!toUserId || !postId || !commentId || !fromUserId) return;
  const nid = `like_${toUserId}_${postId}_${commentId}`;
  const ref = doc(db, 'notifications', nid);

  // Thử update mù (doc đã tồn tại)
  try {
    await updateDoc(ref, {
      toUserId,
      fromUserId, // rất quan trọng để pass rule write
      type: 'like',
      postId: String(postId),
      commentId,
      isRead: false,
      updatedAt: serverTimestamp(),
      lastLikerName: fromUserName || 'Ai đó',
      lastLikerPhoto: fromUserPhoto || '',
      postTitle,
      commentText,
      // gộp
      count: increment(1),
      likers: arrayUnion(fromUserId),
    });
    return;
  } catch (_) {
    // NOT_FOUND -> setDoc tạo mới
  }

  await setDoc(ref, {
    toUserId,
    fromUserId,
    type: 'like',
    postId: String(postId),
    commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastLikerName: fromUserName || 'Ai đó',
    lastLikerPhoto: fromUserPhoto || '',
    postTitle,
    commentText,
    count: 1,
    likers: [fromUserId],
  }, { merge: true });
}

/* ============ UI bits ============ */
function CenterModal({ open, title, children, onClose, actions, tone = 'info' }) {
  if (!open) return null;
  const toneClass =
    tone === 'success' ? 'border-emerald-300 bg-emerald-50' :
    tone === 'error'   ? 'border-rose-300 bg-rose-50' :
    tone === 'warning' ? 'border-amber-300 bg-amber-50' :
                         'border-sky-300 bg-sky-50';
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative w-[92vw] max-w-md rounded-2xl border shadow-2xl p-4 ${toneClass}`}>
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="text-sm text-gray-900">{children}</div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

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

/* ============ ReplyBox ============ */
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
    if (!me) return onNeedLogin?.();
    if (!me.emailVerified) return onNeedVerify?.();
    setOpen(true);
  };

  const onReply = async (e) => {
    e.preventDefault();
    if (!me) return onNeedLogin?.();
    if (!me.emailVerified) return onNeedVerify?.();
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

      // thông báo cho người bị reply
      if (target.authorId && target.authorId !== me.uid) {
        await createNotification({
          toUserId: target.authorId,
          fromUserId: me.uid,
          type: 'reply',
          postId: String(postId),
          commentId: ref.id,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle || '',
          commentText: excerpt(text),
        });
      }

      // (tùy) thông báo cho admin khác không trùng người nhận ở trên
      const targets = (adminUids || []).filter(uid => uid !== me.uid && uid !== target.authorId);
      await Promise.all(targets.map(uid => createNotification({
        toUserId: uid,
        fromUserId: me.uid,
        type: 'comment',
        postId: String(postId),
        commentId: ref.id,
        fromUserName: preferredName(me),
        fromUserPhoto: preferredPhoto(me),
        postTitle: postTitle || '',
        commentText: excerpt(text),
      })));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mt-2">
      {renderTrigger ? (
        renderTrigger({ open, tryOpen, setOpen })
      ) : (
        <button onClick={tryOpen} className="text-sm text-sky-600 hover:underline inline-flex items-center gap-1">
          <FontAwesomeIcon icon={faReply} /> Trả lời
        </button>
      )}

      {open && (
        <form onSubmit={onReply} className="mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-lg border px-3 py-2 text-sm"
            placeholder="Viết phản hồi của bạn…"
            rows={3}
          />
          <div className="mt-2 flex items-center gap-2">
            <button type="submit" disabled={sending || !text.trim()} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90 disabled:opacity-50">
              <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
              Gửi
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm rounded-lg border hover:bg-white">Hủy</button>
          </div>
        </form>
      )}
    </div>
  );
}

/* ============ Root comment item ============ */
function RootItem({
  c, me, adminUids, postId, postTitle,
  onDelete, onNeedLogin, onNeedVerify, onToggleLike,
  isAdminFn, replies
}) {
  const dt = formatDate(c.createdAt);
  const canDelete = !!me && (me.uid === c.authorId || isAdminFn?.(me.uid));
  const hasLiked = !!me && (c.likedBy || []).includes(me.uid);
  const likeCount = c.likeCount || 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
      <CommentHeader c={c} me={me} isAdminFn={isAdminFn} dt={dt} canDelete={canDelete} onDelete={() => onDelete(c)} />
      <div className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">{c.content}</div>

      <ActionBar
        hasLiked={hasLiked}
        likeCount={likeCount}
        onToggleLike={() => onToggleLike(c)}
        renderReplyTrigger={() => (
          <ReplyBox
            me={me}
            postId={postId}
            parent={c}
            replyingTo={c}
            adminUids={adminUids}
            postTitle={postTitle}
            onNeedLogin={onNeedLogin}
            onNeedVerify={onNeedVerify}
          />
        )}
      />

      {/* Replies */}
      {replies?.length > 0 && (
        <div className="mt-4 space-y-4">
          {replies.map((r) => {
            const rdt = formatDate(r.createdAt);
            const rCanDelete = !!me && (me.uid === r.authorId || isAdminFn?.(me.uid));
            const rHasLiked = !!me && (r.likedBy || []).includes(me.uid);
            const rLikeCount = r.likeCount || 0;

            return (
              <div key={r.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 p-3">
                <CommentHeader c={r} me={me} isAdminFn={isAdminFn} dt={rdt} canDelete={rCanDelete} onDelete={() => onDelete(r)} />
                {/* Quote */}
                <Quote quoteFrom={c} me={me} />
                {/* Content */}
                <div className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">{r.content}</div>

                <ActionBar
                  hasLiked={rHasLiked}
                  likeCount={rLikeCount}
                  onToggleLike={() => onToggleLike(r)}
                  renderReplyTrigger={() => (
                    <ReplyBox
                      me={me}
                      postId={postId}
                      parent={c}
                      replyingTo={r}
                      adminUids={adminUids}
                      postTitle={postTitle}
                      onNeedLogin={onNeedLogin}
                      onNeedVerify={onNeedVerify}
                    />
                  )}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============ Main Comments ============ */
const PAGE_SIZE = 20;

export default function Comments({ postId, postTitle = '' }) {
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [liveItems, setLiveItems] = useState([]);
  const [olderItems, setOlderItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [content, setContent] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  // Chỉ KHAI BÁO 1 LẦN
  const [likingIds, setLikingIds] = useState(() => new Set());

  const unsubRef = useRef(null);
  const lastDocRef = useRef(null);

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  // load admins
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

  const isAdmin = (uid) => !!uid && adminUids.includes(uid);

  // subscribe list
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    setOlderItems([]);
    setHasMore(false);
    lastDocRef.current = null;
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    const qn = query(
      collection(db, 'comments'),
      where('postId', '==', String(postId)),
      orderBy('createdAt', 'desc'),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(qn, (snap) => {
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

  // điền tên/ảnh còn thiếu cho comment của mình (nếu có)
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
      const qn = query(
        collection(db, 'comments'),
        where('postId', '==', String(postId)),
        orderBy('createdAt', 'desc'),
        startAfter(lastDocRef.current),
        limit(PAGE_SIZE)
      );
      const snap = await getDocs(qn);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setOlderItems(prev => [...prev, ...list]);
      const lastVisible = snap.docs[snap.docs.length - 1] || null;
      lastDocRef.current = lastVisible;
      setHasMore(!!lastVisible);
    } finally {
      setLoadingMore(false);
    }
  };

  /* ------- Modal helpers ------- */
  const openHeaderLoginPopup = () => {
    if (typeof window === 'undefined') return;
    try { window.dispatchEvent(new Event('close-login')); } catch {}
    try { window.dispatchEvent(new Event('open-auth')); } catch {}
  };
  const openLoginPrompt = () => {
    setModalTitle('Cần đăng nhập');
    setModalContent(<p>Bạn cần <b>đăng nhập</b> để thực hiện thao tác này.</p>);
    setModalTone('info');
    setModalActions(
      <>
        <button onClick={() => { setModalOpen(false); openHeaderLoginPopup(); }} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90">Đăng nhập</button>
        <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Để sau</button>
      </>
    );
    setModalOpen(true);
  };
  const openVerifyPrompt = () => {
    setModalTitle('Cần xác minh email');
    setModalContent(
      <div>
        <p>Tài khoản của bạn <b>chưa được xác minh email</b>. Vui lòng xác minh để có thể bình luận.</p>
        <p className="mt-2 text-xs text-gray-600">Không thấy email? Hãy kiểm tra thư rác hoặc gửi lại.</p>
      </div>
    );
    setModalTone('info');
    setModalActions(
      <>
        <button
          onClick={async () => {
            try {
              if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
                setModalContent(<p>Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.</p>);
                setModalTone('success');
              }
            } catch {
              setModalContent(<p>Không gửi được email xác minh. Vui lòng thử lại sau.</p>);
              setModalTone('error');
            }
          }}
          className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Gửi lại email xác minh
        </button>
        <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Để sau</button>
      </>
    );
    setModalOpen(true);
  };

  /* ------- Post new root comment ------- */
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me) return openLoginPrompt();
    if (!me.emailVerified) return openVerifyPrompt();
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

      // thông báo cho admin (nếu có) khi có bình luận mới
      const targetAdmins = (adminUids || []).filter(u => u !== me.uid);
      await Promise.all(targetAdmins.map(uid => createNotification({
        toUserId: uid,
        fromUserId: me.uid,
        type: 'comment',
        postId: String(postId),
        commentId: ref.id,
        fromUserName: preferredName(me),
        fromUserPhoto: preferredPhoto(me),
        postTitle: postTitle || '',
        commentText: excerpt(payload.content),
      })));
    } finally { setSubmitting(false); }
  };

  /* ------- Like / Unlike ------- */
  const toggleLike = async (c) => {
    if (!me) return openLoginPrompt();
    if (likingIds.has(c.id)) return;

    setLikingIds(prev => new Set(prev).add(c.id));
    try {
      const cref = doc(db, 'comments', c.id);
      const res = await runTransaction(db, async (tx) => {
        const snap = await tx.get(cref);
        if (!snap.exists()) return { didLike: false, data: null };
        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const hasLiked = likedBy.includes(me.uid);

        if (hasLiked) {
          tx.update(cref, {
            likedBy: arrayRemove(me.uid),
            likeCount: Math.max(0, (data.likeCount || 0) - 1)
          });
          return { didLike: false, data };
        } else {
          tx.update(cref, {
            likedBy: arrayUnion(me.uid),
            likeCount: (data.likeCount || 0) + 1
          });
          return { didLike: true, data };
        }
      });

      // Nếu là thao tác "like", tạo/upsert thông báo cho tác giả bình luận
      if (res?.didLike) {
        const targetUid = res.data?.authorId;
        if (targetUid && targetUid !== me.uid) {
          // Admin là tác giả -> admin cũng là toUserId -> sẽ NHẬN thông báo
          await upsertLikeNotification({
            toUserId: targetUid,
            postId: String(postId),
            commentId: c.id,
            fromUserId: me.uid,
            fromUserName: preferredName(me),
            fromUserPhoto: preferredPhoto(me),
            postTitle: postTitle || '',
            commentText: excerpt(c.content)
          });
        }
      }
    } finally {
      setLikingIds(prev => {
        const n = new Set(prev);
        n.delete(c.id);
        return n;
      });
    }
  };

  /* ------- Delete comment ------- */
  const onDelete = async (c) => {
    if (!me) return;
    // quyền đã kiểm soát ở Rules; UI chỉ hiển thị khi đoán là có quyền
    await deleteDoc(doc(db, 'comments', c.id));
  };

  return (
    <div>
      {/* Form bình luận */}
      <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm"
          rows={3}
          placeholder="Viết bình luận của bạn…"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Gửi bình luận
          </button>
        </div>
      </form>

      {/* Danh sách */}
      <div className="mt-6 space-y-4">
        {loading && <div className="text-sm text-gray-500">Đang tải…</div>}
        {!loading && roots.length === 0 && <div className="text-sm text-gray-500">Chưa có bình luận nào.</div>}
        {roots.map((c) => (
          <RootItem
            key={c.id}
            c={c}
            me={me}
            adminUids={adminUids}
            postId={postId}
            postTitle={postTitle}
            onDelete={onDelete}
            onToggleLike={toggleLike}
            onNeedLogin={openLoginPrompt}
            onNeedVerify={openVerifyPrompt}
            isAdminFn={isAdmin}
            replies={repliesByParent[c.id] || []}
          />
        ))}
      </div>

      {hasMore && (
        <div className="mt-4">
          <button onClick={loadMore} disabled={loadingMore} className="px-3 py-2 text-sm rounded-lg border hover:bg-white disabled:opacity-50">
            {loadingMore ? 'Đang tải…' : 'Tải thêm'}
          </button>
        </div>
      )}

      {/* Modal */}
      <CenterModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        actions={modalActions}
        tone={modalTone}
      >
        {modalContent}
      </CenterModal>
    </div>
  );
}