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
function excerpt(s, n = 160) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/* ================= Notifications ================= */
// ❗️Chỉ bump counter cho CHÍNH MÌNH (tránh permission-denied khi đụng doc người khác theo rules bạn dùng)
async function bumpCounter(uid, delta) {
  if (!uid || !Number.isFinite(delta)) return;
  if (auth.currentUser?.uid !== uid) return; // chặn bump chéo user
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data()?.unreadCount || 0) : 0;
    tx.set(ref, {
      unreadCount: Math.max(0, cur + delta),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  });
}

// Tạo 1 thông báo đơn (không dùng cho like gộp)
async function createNotification(data) {
  const ref = doc(collection(db, 'notifications'));
  await setDoc(ref, {
    ...data,
    isRead: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  // bump counter CHÍNH MÌNH nếu người nhận = mình (rules của bạn chỉ cho chính chủ update user_counters/{uid})
  await bumpCounter(data.toUserId, +1);
}

/** Gộp thông báo LIKE theo (toUserId, postId, commentId) */
async function upsertLikeNotification({
  toUserId, postId, commentId,
  fromUserId, fromUserName, fromUserPhoto,
  postTitle = '', commentText = ''
}) {
  if (!toUserId || !postId || !commentId) return;
  const nid = `like_${toUserId}_${postId}_${commentId}`; // ID cố định để upsert
  const ref = doc(db, 'notifications', nid);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists()) {
      const data = snap.data() || {};
      const nextCount = (data.count || 1) + 1;
      const nextLikers = Array.from(new Set([...(data.likers || []), fromUserId])).slice(-5);
      tx.set(ref, {
        toUserId,
        type: 'like',
        postId: String(postId),
        commentId,
        isRead: false,                     // "đánh thức" khi có người mới like
        updatedAt: serverTimestamp(),      // dùng cho sort nếu muốn
        lastLikerName: fromUserName || 'Ai đó',
        lastLikerPhoto: fromUserPhoto || '',
        postTitle,
        commentText,
        count: nextCount,
        likers: nextLikers,
      }, { merge: true });
    } else {
      tx.set(ref, {
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
      });
    }
  });

  // Không bump counter chéo người khác: chỉ cho phép nếu người nhận là chính currentUser
  await bumpCounter(toUserId, +1);
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
    await setDoc(uref, {
      ...base,
      createdAt: serverTimestamp(),
      stats: { comments: 0, likesReceived: 0 },
    }, { merge: true });
  } else {
    await setDoc(uref, base, { merge: true });
  }
}

/* ================= UI bits ================= */
function VerifiedBadgeX(props) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fill="currentColor"
        d="M22 12c0 1.3-.8 2.5-2 3 .2 1.2-.2 2.6-1.3 3.3-1.1.7-2.5.7-3.6 0-.8 1-2 1.7-3.1 1.7s-2.3-.6-3.1-1.7c-1.1.7-2.5.7-3.6 0-1.1-.7-1.6-2.1-1.3-3.3-1.2-.5-2-1.7-2-3s.8-2.5 2-3c-.2-1.2.2-2.6 1.3-3.3 1.1-.7 2.5-.7 3.6 0 .8-1 2-1.7 3.1-1.7s2.3.6 3.1 1.7c1.1-.7 2.5-.7 3.6 0 1.1.7 1.6 2.1 1.3 3.3 1.2.5 2 1.7 2 3zm-11 2.6 4.7-4.7-1.4-1.4L11 12.8l-1.9-1.9-1.4 1.4 3.3 3.3z"
      />
    </svg>
  );
}

/* ================= CenterModal (alert/confirm) ================= */
function CenterModal({ open, title, children, onClose, actions, tone = 'info' }) {
  if (!open) return null;
  const toneClass =
    tone === 'success' ? 'border-emerald-300 bg-emerald-50' :
    tone === 'error'   ? 'border-rose-300 bg-rose-50' :
    tone === 'warning' ? 'border-amber-300 bg-amber-50' :
    'border-sky-300 bg-sky-50';
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className={`relative z-[121] w-full max-w-lg rounded-2xl border ${toneClass} shadow-xl`}>
        <div className="p-4 border-b border-black/5">
          <h3 className="font-semibold">{title || 'Thông báo'}</h3>
        </div>
        <div className="p-4 text-sm text-gray-800">{children}</div>
        <div className="px-4 py-3 border-t border-black/5 flex gap-2 justify-end bg-white/50">
          {actions || <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border">Đóng</button>}
        </div>
      </div>
    </div>
  );
}

/* ================= Sub‑components ================= */
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

/* ================= Main ================= */
export default function Comments({ postId, postTitle }) {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [content, setContent] = useState('');
  const [liveItems, setLiveItems] = useState([]);
  const [olderItems, setOlderItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef(null);
  const unsubRef = useRef(null);

  // Modal state (giữ nguyên UI gốc với confirm xoá)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  // local guards
  const [likingIds, setLikingIds] = useState(() => new Set());
  const [threadsToExpand, setThreadsToExpand] = useState(new Set());

  const PAGE_SIZE = 12;

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
  const openConfirm = (message, onConfirm) => {
    setModalTitle('Xác nhận xoá');
    setModalContent(<p>{message}</p>);
    setModalTone('warning');
    setModalActions(
      <>
        <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Huỷ</button>
        <button onClick={async () => { setModalOpen(false); await onConfirm(); }} className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">Xoá</button>
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

  // auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  // fetch admins
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

  // load comments realtime (page 1)
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

  // ensure header fields for own comments
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

  // submit root comment
  const [submitting, setSubmitting] = useState(false);
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me) { openLoginPrompt(); return; }
    if (!me.emailVerified) { openVerifyPrompt(); return; }
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

      // Thông báo cho admin (nếu có), KHÔNG bump counter chéo user (bumpCounter đã chặn)
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

  // like / unlike + upsert notification (cả admin là tác giả cũng nhận)
  const toggleLike = async (c) => {
    if (!me) { openLoginPrompt(); return; }
    if (likingIds.has(c.id)) return;
    setLikingIds(prev => new Set(prev).add(c.id));

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

      // Chỉ khi LIKE (không phải UNLIKE) thì upsert thông báo gộp -- áp dụng cho mọi tác giả (user hoặc admin)
      if (!hasLiked && me.uid !== c.authorId && c.authorId) {
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
      setLikingIds(prev => {
        const n = new Set(prev); n.delete(c.id); return n;
      });
    }
  };

  // delete single/whole thread (giữ đúng UI gốc: confirm trước khi xoá)
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

  // Cuộn tới bình luận từ notification ?comment=<id>
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
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        }
      }
    };
    scrollToComment();
  }, [router.query.comment, items]);

  // can delete?
  const isAdmin = (uid) => adminUids.includes(uid);
  const canDeleteComment = (c) => {
    if (!me) return false;
    return c.authorId === me.uid || isAdmin(me.uid);
  };

  // sub components
  const ReplyForm = ({ parent, onDone }) => {
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);

    const submitReply = async (e) => {
      e.preventDefault();
      if (!me) { openLoginPrompt(); return; }
      if (!me.emailVerified) { openVerifyPrompt(); return; }
      if (!text.trim() || busy) return;

      setBusy(true);
      try {
        await ensureUserDoc(me);
        const payload = {
          postId: String(postId),
          parentId: parent.id,
          authorId: me.uid,
          userName: preferredName(me),
          userPhoto: preferredPhoto(me),
          content: text.trim(),
          createdAt: serverTimestamp(),
          replyToUserId: parent.authorId || null,
          likeCount: 0,
          likedBy: []
        };
        const ref = await addDoc(collection(db, 'comments'), payload);
        setText('');
        await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) });

        // Thông báo cho chủ comment cha (nếu khác mình)
        const toUid = parent.authorId;
        if (toUid && toUid !== me.uid) {
          await createNotification({
            toUserId: toUid,
            type: 'reply',
            postId: String(postId),
            commentId: ref.id,
            fromUserId: me.uid,
            fromUserName: preferredName(me),
            fromUserPhoto: preferredPhoto(me),
            postTitle: postTitle || '',
            commentText: excerpt(payload.content),
          });
        }
        onDone?.();
      } finally {
        setBusy(false);
      }
    };

    return (
      <form onSubmit={submitReply} className="mt-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết phản hồi…"
          rows={2}
          className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            type="submit"
            disabled={!text.trim() || busy}
            className="px-3 py-1.5 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Gửi phản hồi
          </button>
          <button type="button" onClick={() => onDone?.()} className="px-3 py-1.5 text-sm rounded-lg border hover:bg-white">
            Huỷ
          </button>
        </div>
      </form>
    );
  };

  const ReplyItem = ({ r, me }) => {
    const dt = formatDate(r.createdAt);
    const hasLiked = Array.isArray(r.likedBy) && me && r.likedBy.includes(me.uid);
    const onDelete = () => openConfirm('Xoá phản hồi này?', async () => { await deleteSingleComment(r); });

    return (
      <div id={`c-${r.id}`} className="mt-3 pl-12">
        <CommentHeader
          c={r}
          me={me}
          isAdminFn={isAdmin}
          dt={dt}
          canDelete={canDeleteComment(r)}
          onDelete={onDelete}
        />
        <div className="mt-1 text-sm whitespace-pre-wrap break-words leading-relaxed">{r.content}</div>

        <ActionBar
          hasLiked={hasLiked}
          likeCount={r.likeCount || 0}
          onToggleLike={() => toggleLike(r)}
          renderReplyTrigger={null}
        />
      </div>
    );
  };

  const RootItem = ({ c, me, replies }) => {
    const dt = formatDate(c.createdAt);
    const [showReply, setShowReply] = useState(false);
    const hasLiked = Array.isArray(c.likedBy) && me && c.likedBy.includes(me.uid);
    const expanded = threadsToExpand.has(c.id);

    const onDelete = () => {
      const hasChildren = (replies || []).length > 0;
      if (hasChildren) {
        openConfirm('Xoá cả chuỗi bình luận này (bao gồm tất cả phản hồi)?', async () => { await deleteThreadBatch(c); });
      } else {
        openConfirm('Xoá bình luận này?', async () => { await deleteSingleComment(c); });
      }
    };

    return (
      <div id={`c-${c.id}`} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <CommentHeader
          c={c}
          me={me}
          isAdminFn={isAdmin}
          dt={dt}
          canDelete={canDeleteComment(c)}
          onDelete={onDelete}
        />

        <div className="mt-2 text-sm whitespace-pre-wrap break-words leading-relaxed">{c.content}</div>

        <ActionBar
          hasLiked={hasLiked}
          likeCount={c.likeCount || 0}
          onToggleLike={() => toggleLike(c)}
          renderReplyTrigger={() => (
            <button
              onClick={() => setShowReply(s => !s)}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Phản hồi"
            >
              <FontAwesomeIcon icon={faReply} />
              Phản hồi
            </button>
          )}
        />

        {showReply && (
          <ReplyForm parent={c} onDone={() => setShowReply(false)} />
        )}

        {(expanded || (replies || []).length > 0) && (
          <div className="mt-2">
            {(replies || []).map(r => (
              <ReplyItem key={r.id} r={r} me={me} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Form */}
      <form onSubmit={onSubmit} className="p-4 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-50 dark:bg-gray-900/40 shrink-0">
            {me?.photoURL ? (
              <img src={preferredPhoto(me)} alt="me" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6 text-sky-500" />
            )}
          </div>

          <div className="flex-1">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm bg-white dark:bg-gray-900"
              placeholder="Hãy để lại bình luận của bạn…"
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs text-gray-500">{content.length}/1000</div>
              <button
                type="submit"
                disabled={submitting || !content.trim()}
                className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90 disabled:opacity-50"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
                Gửi bình luận
              </button>
            </div>
          </div>
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
            postId={postId}
            postTitle={postTitle}
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