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
  getDocs, startAfter, writeBatch, documentId
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faReply, faTrash, faUserCircle, faHeart,
  faChevronDown, faComments, faEllipsisVertical, faPenToSquare
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
async function bumpCounter(uid, delta) {
  if (!uid || !Number.isFinite(delta)) return;
  if (auth.currentUser?.uid !== uid) return;
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
async function upsertLikeNotification({
  toUserId, postId, commentId,
  fromUserId, fromUserName, fromUserPhoto,
  postTitle = '', commentText = ''
}) {
  if (!toUserId || !postId || !commentId || !fromUserId) return;
  const nid = `like_${toUserId}_${postId}_${commentId}`;
  const ref = doc(db, 'notifications', nid);
  try {
    await updateDoc(ref, {
      toUserId,
      fromUserId,
      type: 'like',
      postId: String(postId),
      commentId,
      isRead: false,
      updatedAt: serverTimestamp(),
      lastLikerName: fromUserName || 'Ai đó',
      lastLikerPhoto: fromUserPhoto || '',
      postTitle,
      commentText,
      count: increment(1),
      likers: arrayUnion(fromUserId),
    });
    return;
  } catch {}
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

/* ================= Modal đơn giản ================= */
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

/* ================= Verified badge ================= */
const VerifiedBadgeX = ({ className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`inline-block ${className}`} fill="#1d9bf0">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

/* ============ Nút menu ba chấm cho Sửa / Xoá ============ */
function DotMenu({ canEdit, canDelete, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative ml-auto">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10"
        aria-label="Mở menu"
        title="Tuỳ chọn"
      >
        <FontAwesomeIcon icon={faEllipsisVertical} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-20">
          {canEdit && (
            <button
              onClick={() => { setOpen(false); onEdit?.(); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPenToSquare} className="w-4 h-4" />
              Sửa
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => { setOpen(false); onDelete?.(); }}
              className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 inline-flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
              Xoá
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ================= Sub‑components ================= */
function ActionBar({ hasLiked, likeCount, onToggleLike, renderReplyTrigger, renderLikersToggle }) {
  return (
    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
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

      {renderLikersToggle?.()}
      <div className="ml-2">{renderReplyTrigger?.()}</div>
    </div>
  );
}

/* ----------------- Lấy avatar/tên mới & trạng thái xoá ----------------- */
function useAuthorMap(allComments) {
  const [authorMap, setAuthorMap] = useState({});
  useEffect(() => {
    const ids = Array.from(new Set(allComments.map(c => c.authorId).filter(Boolean)));
    if (ids.length === 0) { setAuthorMap({}); return; }
    (async () => {
      const map = {};
      for (let i = 0; i < ids.length; i += 10) {
        const batch = ids.slice(i, i + 10);
        const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
        const snap = await getDocs(q);
        snap.forEach(d => { map[d.id] = d.data(); });
      }
      setAuthorMap(map);
    })();
  }, [allComments]);
  return authorMap;
}

/* ================= Header người viết ================= */
function CommentHeader({ c, me, isAdminFn, dt, authorMap }) {
  const info = authorMap?.[c.authorId] || null;
  const isDeletedUser = info?.status === 'deleted';
  const isAdmin = isAdminFn?.(c.authorId);
  const isSelf = !!me && c.authorId === me.uid;

  const avatar = info?.photoURL || c.userPhoto || '';
  const userName = info?.displayName || c.userName || 'Người dùng';

  const NameLink = ({ uid, children }) => {
  const info = authorMap?.[uid];
  const isDeletedUser = info?.status === 'deleted';

  if (!uid || isDeletedUser) {
    return (
      <span
        className="font-semibold text-gray-400 cursor-not-allowed"
        title={isDeletedUser ? 'Tài khoản đã bị xóa' : ''}
      >
        {children}
      </span>
    );
  }

  const href = isSelf ? '/profile' : `/users/${uid}`;
  return (
    <Link
      href={href}
      className="font-semibold text-sky-800 dark:text-sky-200 hover:underline"
    >
      {children}
    </Link>
  );
};


  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-sky-200/60 dark:border-sky-800/60 overflow-hidden bg-white/60 dark:bg-gray-900/40">
        {avatar && !isDeletedUser ? (
          <img src={avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5 text-sky-600" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1 flex items-center gap-2">
        <NameLink uid={c.authorId}>{userName}</NameLink>
        {isAdmin && (
          <span className="inline-flex items-center justify-center translate-y-[0.5px]" title="Quản trị viên đã xác minh">
            <VerifiedBadgeX className="w-4 h-4 shrink-0" />
          </span>
        )}
        <span className="text-xs text-sky-900/70 dark:text-sky-200/70 truncate" title={dt?.abs}>{dt?.rel}</span>
      </div>
    </div>
  );
}

/* ================= Quote ================= */
function Quote({ quoteFrom, me, authorMap }) {
  if (!quoteFrom) return null;
  const authorId = quoteFrom.authorId;
  const info = authorMap?.[authorId] || null;
  const isDeleted = info?.status === 'deleted';
  const authorName = info?.displayName || quoteFrom.userName || 'Người dùng';

  const Name = () => (
    !authorId || isDeleted ? (
      <span className="text-gray-500 dark:text-gray-400" title={isDeleted ? 'Tài khoản đã xoá' : ''}>{authorName}</span>
    ) : (
      <Link
        href={me && authorId === me.uid ? '/profile' : `/users/${authorId}`}
        className="hover:underline"
      >
        {authorName}
      </Link>
    )
  );

  return (
    <div className="mt-3 mb-3 border-l-4 border-orange-200 bg-orange-50 rounded-r-lg">
      <div className="p-3">
        <div className="flex items-center gap-2 text-xs text-orange-600 font-medium mb-1">
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
            <path d="M7.17 6C5.97 6 5 6.97 5 8.17v3.66C5 13.03 5.97 14 7.17 14h2.16A1.67 1.67 0 0 0 11 12.33V8.17C11 6.97 10.03 6 8.83 6H7.17zm9 0C14.97 6 14 6.97 14 8.17v3.66C14 13.03 14.97 14 16.17 14h2.16A1.67 1.67 0 0 0 20 12.33V8.17C20 6.97 19.03 6 17.83 6h-1.66z"/>
          </svg>
          <span className="flex items-center gap-1">
            <Name /> <span>đã nói:</span>
          </span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
          {excerpt(quoteFrom.content, 200)}
        </p>
      </div>
    </div>
  );
}

/* ============ Likers dropdown ============ */
function LikersToggle({ comment }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [people, setPeople] = useState([]);
  const [err, setErr] = useState('');

  const fetchLikers = async () => {
    const uids = Array.isArray(comment?.likedBy) ? comment.likedBy : [];
    if (uids.length === 0) { setPeople([]); return; }
    setLoading(true);
    setErr('');
    try {
      const chunks = [];
      for (let i = 0; i < uids.length; i += 10) chunks.push(uids.slice(i, i + 10));
      const acc = [];
      for (const ids of chunks) {
        const q = query(collection(db, 'users'), where(documentId(), 'in', ids));
        const snap = await getDocs(q);
        snap.forEach(d => acc.push({ uid: d.id, ...d.data() }));
      }
      acc.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setPeople(acc);
    } catch {
      setErr('Không tải được danh sách.');
    } finally {
      setLoading(false);
    }
  };

  const onToggle = async () => {
    if (!open) await fetchLikers();
    setOpen(v => !v);
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={onToggle}
        className="inline-flex items-center px-1 py-1 hover:text-sky-700 dark:hover:text-sky-300"
        title="Xem ai đã thích"
        aria-label="Xem ai đã thích"
      >
        <FontAwesomeIcon icon={faChevronDown} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-72 max-h-64 overflow-auto rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg p-2 z-[60]">
          {loading ? (
            <div className="text-xs text-gray-500 px-2 py-2">Đang tải…</div>
          ) : err ? (
            <div className="text-xs text-rose-600 px-2 py-2">{err}</div>
          ) : people.length === 0 ? (
            <div className="text-xs text-gray-500 px-2 py-2">Chưa có ai thích.</div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {people.map(u => (
                <li key={u.uid} className="flex items-center gap-2 px-2 py-2">
                  <img
                    src={u.photoURL || '/favicon.ico'}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate">
                    {u.displayName || u.email || 'Người dùng'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </span>
  );
}

/* ================= ReplyBox ================= */
function ReplyBox({
  me, postId, parent, replyingTo = null, adminUids, postTitle,
  onNeedVerify, onNeedLogin,
  renderTrigger,
  authorMap
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const target = replyingTo || parent;
  const canReply = !!me && me.uid !== (target?.authorId ?? '');

  const tryOpen = () => {
    if (!me) { onNeedLogin?.(); return; }
    if (!me.emailVerified) { onNeedVerify?.(); return; }
    if (!canReply) return;
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
      }

      const targets = adminUids.filter(u => u !== me.uid && u !== target.authorId);
      await Promise.all(targets.map(async (uid) => {
        await createNotification({
          toUserId: uid,
          type: 'comment',
          postId: String(postId),
          commentId: ref.id,
          fromUserId: me.uid,
          fromUserPhoto: preferredPhoto(me),
          fromUserName: preferredName(me),
          postTitle: postTitle || '',
          commentText: excerpt(text),
        });
      }));
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      {!open && (renderTrigger ? renderTrigger(tryOpen, canReply) : (
        canReply && (
          <button onClick={tryOpen} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline">
            <FontAwesomeIcon icon={faReply} />
            Trả lời
          </button>
        )
      ))}

      {open && (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          {target && <Quote quoteFrom={target} me={me} authorMap={authorMap} />}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[72px] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none shadow-sm"
            placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName || 'người dùng') : (parent.userName || 'người dùng')}…`}
            maxLength={2000}
          />
          <div className="text-xs text-gray-500 dark:text-gray-400 text-right -mt-1">{text.length}/2000</div>

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

/* ====== RootComment ====== */
function RootComment({
  c, replies, me, adminUids, postId, postTitle,
  onOpenConfirm, toggleLike, deleteSingleComment, deleteThreadBatch,
  initialShowReplies, authorMap,
  onNeedVerify, onNeedLogin
}) {
  const [showReplies, setShowReplies] = useState(!!initialShowReplies);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(c.content || '');
  const dt = formatDate(c.createdAt);
  const hasLiked = !!me && Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
  const likeCount = c.likeCount || 0;
  const canDeleteRoot = !!me && (me.uid === c.authorId || adminUids.includes(me.uid));
  const canEditRoot = !!me && me.uid === c.authorId;
  const canReplyRoot = !!me && me.uid !== c.authorId;

  const onSaveEdit = async () => {
    const txt = (editText || '').trim();
    if (!txt) return;
    await updateDoc(doc(db, 'comments', c.id), {
      content: txt,
      updatedAt: serverTimestamp(),
    });
    setEditing(false);
  };

  return (
    <li key={c.id} id={`c-${c.id}`} className="scroll-mt-24 mb-4 last:mb-0">
      <div className="rounded-xl border border-sky-200/70 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
        <div className="px-4 sm:px-6 py-2 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 border-b border-sky-100/80 dark:border-gray-800 flex items-center gap-3">
          <CommentHeader c={c} me={me} isAdminFn={(uid)=>adminUids.includes(uid)} dt={dt} authorMap={authorMap} />
          <DotMenu
            canEdit={canEditRoot}
            canDelete={canDeleteRoot}
            onEdit={() => { setEditing(true); setEditText(c.content || ''); }}
            onDelete={() => {
              if (typeof onOpenConfirm === 'function') {
                onOpenConfirm('Xoá bình luận này và toàn bộ phản hồi của nó?', async () => { await deleteThreadBatch(c); });
              } else if (typeof window !== 'undefined' && window.confirm('Xoá bình luận này và toàn bộ phản hồi của nó?')) {
                deleteThreadBatch(c);
              }
            }}
          />
        </div>

        <div className="px-4 sm:px-6 py-3">
          {!editing ? (
            <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
              {c.content}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <textarea
                value={editText}
                onChange={(e)=>setEditText(e.target.value)}
                className="w-full min-h-[96px] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none"
                maxLength={3000}
              />
              <div className="text-xs text-gray-500 dark:text-gray-400 text-right -mt-1">{editText.length}/3000</div>
              <div className="flex gap-2 justify-end">
                <button onClick={()=>{ setEditing(false); setEditText(c.content || ''); }} className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Huỷ</button>
                <button onClick={onSaveEdit} disabled={!editText.trim()} className={`px-4 py-2 text-sm rounded-xl text-white ${!editText.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Lưu</button>
              </div>
            </div>
          )}

          <div className="px-0">
            <ReplyBox
              me={me}
              postId={postId}
              parent={c}
              adminUids={adminUids}
              postTitle={postTitle}
              onNeedVerify={onNeedVerify}
              onNeedLogin={onNeedLogin}
              renderTrigger={(openFn, canReply) => (
                <ActionBar
                  hasLiked={hasLiked}
                  likeCount={likeCount}
                  onToggleLike={() => toggleLike(c)}
                  renderLikersToggle={() => <LikersToggle comment={c} />}
                  renderReplyTrigger={() => (
                    canReplyRoot && canReply ? (
                      <button
                        onClick={openFn}
                        className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline"
                      >
                        <FontAwesomeIcon icon={faReply} />
                        <span>Trả lời</span>
                      </button>
                    ) : null
                  )}
                />
              )}
              authorMap={authorMap}
            />
          </div>

          {replies.length > 0 && (
            <div className="mt-3">
              {showReplies ? (
                <ul className="space-y-4">
                  {replies.map((r) => (
                    <ReplyItem
                      key={r.id}
                      r={r}
                      parent={c}
                      me={me}
                      adminUids={adminUids}
                      postId={postId}
                      postTitle={postTitle}
                      onOpenConfirm={onOpenConfirm}
                      toggleLike={toggleLike}
                      deleteSingleComment={deleteSingleComment}
                      authorMap={authorMap}
                      onNeedVerify={onNeedVerify}
                      onNeedLogin={onNeedLogin}
                    />
                  ))}
                </ul>
              ) : (
                <button
                  onClick={() => setShowReplies(true)}
                  className="text-sm font-semibold text-sky-600 dark:text-sky-400 hover:underline inline-flex items-center gap-2"
                >
                  Xem {replies.length} câu trả lời
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/* ====== Reply item ====== */
function ReplyItem({
  r, parent, me, adminUids, postId, postTitle,
  onOpenConfirm, toggleLike, deleteSingleComment,
  authorMap, onNeedVerify, onNeedLogin
}) {
  const dt2 = formatDate(r.createdAt);
  const rHasLiked = !!me && Array.isArray(r.likedBy) && r.likedBy.includes(me.uid);
  const rLikeCount = r.likeCount || 0;
  const canDeleteR = !!me && (me.uid === r.authorId || adminUids.includes(me.uid));
  const canEditR = !!me && me.uid === r.authorId;
  const canReplyChild = !!me && me.uid !== r.authorId;

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(r.content || '');

  const onSaveEdit = async () => {
    const txt = (editText || '').trim();
    if (!txt) return;
    await updateDoc(doc(db, 'comments', r.id), {
      content: txt,
      updatedAt: serverTimestamp(),
    });
    setEditing(false);
  };

  const target = r.replyToUserId === parent.authorId ? parent : null;

  return (
    <li id={`c-${r.id}`} className="pl-4 border-l-2 border-gray-200 dark:border-gray-800 scroll-mt-24 rounded-lg bg-white/0">
      <div className="flex items-center gap-3 px-0 py-0">
        <CommentHeader c={r} me={me} isAdminFn={(uid)=>adminUids.includes(uid)} dt={dt2} authorMap={authorMap} />
        <DotMenu
          canEdit={canEditR}
          canDelete={canDeleteR}
          onEdit={() => { setEditing(true); setEditText(r.content || ''); }}
          onDelete={() => {
            if (typeof onOpenConfirm === 'function') {
              onOpenConfirm('Bạn có chắc muốn xoá phản hồi này?', async () => { await deleteSingleComment(r); });
            } else if (typeof window !== 'undefined' && window.confirm('Bạn có chắc muốn xoá phản hồi này?')) {
              deleteSingleComment(r);
            }
          }}
        />
      </div>

      {target && <Quote quoteFrom={target} me={me} authorMap={authorMap} />}

      <div className="mt-2">
        {!editing ? (
          <div className="whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
            {r.content}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={editText}
              onChange={(e)=>setEditText(e.target.value)}
              className="w-full min-h-[80px] border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none"
              maxLength={3000}
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right -mt-1">{editText.length}/3000</div>
            <div className="flex gap-2 justify-end">
              <button onClick={()=>{ setEditing(false); setEditText(r.content || ''); }} className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Huỷ</button>
              <button onClick={onSaveEdit} disabled={!editText.trim()} className={`px-4 py-2 text-sm rounded-xl text-white ${!editText.trim() ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>Lưu</button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-2">
        <ReplyBox
          me={me}
          postId={postId}
          parent={parent}
          replyingTo={r}
          adminUids={adminUids}
          postTitle={postTitle}
          onNeedVerify={onNeedVerify}
          onNeedLogin={onNeedLogin}
          renderTrigger={(openFn, canReply) => (
            <ActionBar
              hasLiked={rHasLiked}
              likeCount={rLikeCount}
              onToggleLike={() => toggleLike(r)}
              renderLikersToggle={() => <LikersToggle comment={r} />}
              renderReplyTrigger={() => (
                canReplyChild && canReply ? (
                  <button
                    onClick={openFn}
                    className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline"
                  >
                    <FontAwesomeIcon icon={faReply} />
                    <span>Trả lời</span>
                  </button>
                ) : null
              )}
            />
          )}
          authorMap={authorMap}
        />
      </div>
    </li>
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

  // 🔧 Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');
  // Dùng ref để thay nội dung modal động
  const theModalContentHackRef = useRef(null);

  const [likingIds, setLikingIds] = useState(() => new Set());
  const [threadsToExpand, setThreadsToExpand] = useState(new Set());

  const openHeaderLoginPopup = () => {
    if (typeof window === 'undefined') return;
    try { window.dispatchEvent(new Event('close-login')); } catch {}
    try { window.dispatchEvent(new Event('open-auth')); } catch {}
  };
  const openLoginPrompt = () => {
    setModalTitle('Cần đăng nhập');
    theModalContentHackRef.current = (
      <p>Bạn cần <b>đăng nhập</b> để thực hiện thao tác này.</p>
    );
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
    theModalContentHackRef.current = (<p>{message}</p>);
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
    theModalContentHackRef.current = (
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
                setModalTitle('Đã gửi lại email xác minh');
                theModalContentHackRef.current = (<p>Vui lòng kiểm tra hộp thư của bạn.</p>);
                setModalTone('success');
                setModalActions(
                  <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg bg-emerald-600 text-white hover:bg-emerald-700">Đóng</button>
                );
              }
            } catch {
              setModalTitle('Lỗi');
              theModalContentHackRef.current = (<p>Không gửi được email xác minh. Vui lòng thử lại sau.</p>);
              setModalTone('error');
              setModalActions(
                <button onClick={() => setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Đóng</button>
              );
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

  // Lấy thông tin người dùng cho avatar/tên & kiểm tra đã bị xoá chưa
  const authorMap = useAuthorMap(items);

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
    if (!me) { openLoginPrompt(); return; }
    if (likingIds.has(c.id)) return;

    setLikingIds(prev => new Set(prev).add(c.id));
    try {
      const cref = doc(db, 'comments', c.id);

      const result = await runTransaction(db, async (tx) => {
        const snap = await tx.get(cref);
        if (!snap.exists()) return { didLike: false, data: null, authorId: null };

        const data = snap.data();
        const likedBy = Array.isArray(data.likedBy) ? data.likedBy : [];
        const hasLiked = likedBy.includes(me.uid);

        if (hasLiked) {
          tx.update(cref, {
            likedBy: arrayRemove(me.uid),
            likeCount: Math.max(0, (data.likeCount || 0) - 1),
          });
          return { didLike: false, data, authorId: data.authorId || null };
        } else {
          tx.update(cref, {
            likedBy: arrayUnion(me.uid),
            likeCount: (data.likeCount || 0) + 1,
          });
          return { didLike: true, data, authorId: data.authorId || null };
        }
      });

      if (result?.authorId && result.authorId !== me.uid) {
        try {
          await updateDoc(doc(db, 'users', result.authorId), {
            'stats.likesReceived': increment(result.didLike ? 1 : -1),
          });
        } catch {}
      }

      if (result?.didLike) {
        const targetUid = result.authorId;
        if (targetUid && targetUid !== me.uid) {
          await upsertLikeNotification({
            toUserId: targetUid,
            postId: String(result.data?.postId || c.postId || ''),
            commentId: c.id,
            fromUserId: me.uid,
            fromUserName: preferredName(me),
            fromUserPhoto: preferredPhoto(me),
            postTitle: (typeof postTitle === 'string' ? postTitle : '') || '',
            commentText: excerpt(result.data?.content ?? c.content, 160),
          });
        }
      }
    } finally {
      setLikingIds(prev => { const n = new Set(prev); n.delete(c.id); return n; });
    }
  };

  const deleteThreadBatch = async (root) => {
    const toDelete = [root];
    const pageSize = 200; let cursor = null;
    while (true) {
      const qn = cursor
        ? query(collection(db,'comments'), where('parentId','==',root.id), orderBy('createdAt','desc'), startAfter(cursor), limit(pageSize))
        : query(collection(db,'comments'), where('parentId','==',root.id), orderBy('createdAt','desc'), limit(pageSize));
      const snap = await getDocs(qn);
      if (snap.empty) break;
      snap.docs.forEach(d => toDelete.push({ id: d.id, ...d.data() }));
      if (snap.size < pageSize) break;
      cursor = snap.docs[snap.docs.length - 1];
    }

    const chunk = 400;
    for (let i = 0; i < toDelete.length; i += chunk) {
      const slice = toDelete.slice(i, i + chunk);
      const batch = writeBatch(db);

      const authors = new Set(slice.map(c => c.authorId).filter(Boolean));
      const exist = new Set();
      const snaps = await Promise.all([...authors].map(uid => getDoc(doc(db, 'users', uid))));
      snaps.forEach(s => { if (s.exists()) exist.add(s.id); });

      slice.forEach(it => {
        batch.delete(doc(db, 'comments', it.id));
        if (it.authorId && exist.has(it.authorId)) {
          batch.update(doc(db, 'users', it.authorId), { 'stats.comments': increment(-1) });
        }
      });

      await batch.commit();
    }
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

  const totalCount = roots.length;

  return (
  <div className="mt-6">
    <CenterModal
      open={modalOpen}
      title={modalTitle}
      onClose={() => setModalOpen(false)}
      actions={modalActions}
      tone={modalTone}
    >
      {theModalContentHackRef.current}
    </CenterModal>

    {/* ===== CARD: tiêu đề + form nhập ===== */}
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm">
      <div className="px-4 sm:px-5 py-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-black dark:text-white inline-flex items-center gap-2">
          <FontAwesomeIcon icon={faComments} className="text-sky-600" />
          Bình luận
          <span className="text-sm font-bold text-black dark:text-white">({totalCount})</span>
        </h3>
      </div>

      <div className="px-4 sm:px-5 py-4">
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
            <div className="text-xs text-gray-500 dark:text-gray-400 text-right -mt-1">{content.length}/3000</div>
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
      </div>
    </div>

    {/* ===== DANH SÁCH BÌNH LUẬN ===== */}
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
                onOpenConfirm={openConfirm}
                toggleLike={toggleLike}
                deleteSingleComment={deleteSingleComment}
                deleteThreadBatch={deleteThreadBatch}
                initialShowReplies={threadsToExpand.has(c.id)}
                authorMap={authorMap}
                onNeedVerify={openVerifyPrompt}
                onNeedLogin={openHeaderLoginPopup ? openLoginPrompt : openLoginPrompt}
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