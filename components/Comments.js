// components/Comments.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, setDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, updateDoc, where,
  arrayUnion, arrayRemove, increment
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faReply, faTrash, faUserCircle, faQuoteLeft, faHeart
} from '@fortawesome/free-solid-svg-icons';

/* ========= Small helpers ========= */
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
    if (!ts) return { rel:'', abs:'' };
    if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === 'number') d = new Date(ts);
    else if (typeof ts === 'string') d = new Date(ts);
    else if (ts instanceof Date) d = ts;
    if (!d) return { rel:'', abs:'' };
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
  } catch { return { rel:'', abs:'' }; }
}
function excerpt(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/* ========= Notifications ========= */
async function createNotification(payload = {}) {
  const { toUserId, type, postId, commentId, fromUserId, ...extra } = payload;
  await addDoc(collection(db, 'notifications'), {
    toUserId, type, postId, commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    fromUserId,
    ...extra, // fromUserName, fromUserPhoto, postTitle, commentText, ...
  });
}
async function bumpCounter(uid, delta) {
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(ref, { unreadCount: Math.max(0, cur + delta) }, { merge: true });
  });
}

/* ========= Ensure users/{uid} without overriding createdAt ========= */
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
    // Ưu tiên ngày tạo từ Auth (chính là "ngày tham gia" thật), fallback server time.
    const authCreated = u.metadata?.creationTime ? new Date(u.metadata.creationTime) : null;
    await setDoc(uref, {
      ...base,
      createdAt: authCreated || serverTimestamp(),
      stats: { comments: 0, likesReceived: 0 },
    }, { merge: true });
  } else {
    await setDoc(uref, base, { merge: true });
  }
}

/* ========= Center modal ========= */
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
        <div className="mt-4 flex justify-end gap-2">
          {actions}
        </div>
      </div>
    </div>
  );
}

/* ==================== Component ==================== */
export default function Comments({ postId, postTitle, postUrl }) {
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  // ===== Unified "open login popup like header" =====
  const openHeaderLoginPopup = () => {
    // Cách 1: gọi function đã được Layout gắn vào window
    if (typeof window !== 'undefined' && typeof window.openLogin === 'function') {
      window.openLogin(); // mở popup đăng nhập của header do Layout quản lý :contentReference[oaicite:1]{index=1}
      return;
    }
    // Cách 2: phát sự kiện dự phòng, Layout cũng đang lắng nghe open-login để mở popup :contentReference[oaicite:2]{index=2}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('open-login'));
    }
  };

  // ===== Helpers open modal
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
  const openLoginPrompt = () => {
    // 🔁 Thay vì chuyển /login, gọi đúng popup đăng nhập của header (Layout đã expose). :contentReference[oaicite:3]{index=3}
    openHeaderLoginPopup();
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
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', String(postId)),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setItems(list);
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  // Vá comment cũ thiếu tên/ảnh của chính mình
  useEffect(() => {
    if (!me || items.length === 0) return;
    const fixes = items
      .filter(c => c.authorId === me.uid && (!c.userName || !c.userPhoto))
      .map(c => updateDoc(doc(db, 'comments', c.id), {
        userName: c.userName || preferredName(me),
        userPhoto: c.userPhoto || preferredPhoto(me)
      }).catch(()=>{}));
    if (fixes.length) Promise.all(fixes).catch(()=>{});
  }, [me, items]);

  const isAdmin = useMemo(() => (uid) => adminUids.includes(uid), [adminUids]);

  // ===== Submit bình luận (font-size>=16px đã fix iOS zoom)
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me) { openLoginPrompt(); return; }
    if (!me.emailVerified) { openVerifyPrompt(); return; }
    if (!content.trim()) return;

    await ensureUserDoc(me); // không override createdAt (ưu tiên lấy từ Auth)

    const payload = {
      postId: String(postId),
      postUrl: postUrl || null,   // lưu URL gốc để "bình luận gần đây" link chính xác
      postTitle: postTitle || '',
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

    // +1 thống kê bình luận cho chính mình (nếu bạn đang dùng stats)
    try { await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) }); } catch {}

    // Notify admin khác (nếu có)
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
      await bumpCounter(uid, +1);
    }));
  };

  // ===== Toggle like
  const toggleLike = async (c) => {
    if (!me) { openLoginPrompt(); return; }
    const ref = doc(db, 'comments', c.id);
    const hasLiked = Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
    try {
      await updateDoc(ref, {
        likedBy: hasLiked ? arrayRemove(me.uid) : arrayUnion(me.uid),
        likeCount: increment(hasLiked ? -1 : +1),
      });

      // Cộng lượt thích nhận cho tác giả
      if (c.authorId) {
        try {
          await updateDoc(doc(db, 'users', c.authorId), {
            'stats.likesReceived': increment(hasLiked ? -1 : +1)
          });
        } catch {}
      }

      // Notify khi LIKE người khác
      if (!hasLiked && me.uid !== c.authorId) {
        await createNotification({
          toUserId: c.authorId,
          type: 'like',
          postId: String(c.postId),
          commentId: c.id,
          fromUserId: me.uid,
          fromUserName: preferredName(me),
          fromUserPhoto: preferredPhoto(me),
          postTitle: c.postTitle || postTitle || '',
          commentText: excerpt(c.content, 120),
        });
        await bumpCounter(c.authorId, +1);
      }
    } catch {}
  };

  const roots = items.filter(c => !c.parentId);
  const repliesByParent = useMemo(() => {
    const m = {};
    items.forEach(c => { if (c.parentId) (m[c.parentId] ||= []).push(c); });
    Object.values(m).forEach(arr => arr.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)));
    return m;
  }, [items]);

  return (
    <div className="mt-6">
      {/* Center Modal */}
      <CenterModal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)} actions={modalActions} tone={modalTone}>
        {modalContent}
      </CenterModal>

      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Bình luận</h3>

      {!me ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">
          Hãy <button onClick={openLoginPrompt} className="underline text-blue-600">đăng nhập</button> để bình luận.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            // iOS zoom fix: font-size >= 16px
            className="w-full min-h-[96px] border border-sky-200 dark:border-sky-900 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500/40 outline-none shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
            placeholder="Viết bình luận…"
            maxLength={3000}
            onFocus={() => { if (me && !me.emailVerified) openVerifyPrompt(); }}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 text-white rounded-xl hover:opacity-95 active:scale-95 shadow-sm inline-flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              Gửi
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
          <ul className="space-y-4">
            {roots.map((c) => {
              const replies = repliesByParent[c.id] || [];
              return (
                <li
                  key={c.id}
                  id={`c-${c.id}`}
                  className="scroll-mt-24 rounded-2xl p-3 bg-white/95 dark:bg-gray-900/95 border border-transparent 
                             [background:linear-gradient(#fff,rgba(255,255,255,0.96))_padding-box,linear-gradient(135deg,#bae6fd,#fecaca)_border-box]
                             dark:[background:linear-gradient(#0b0f19,#0b0f19)_padding-box,linear-gradient(135deg,#0ea5e9,#f43f5e)_border-box]
                             hover:shadow-md transition-shadow"
                >
                  <CommentRow
                    c={c}
                    me={me}
                    isAdminFn={(uid)=>adminUids.includes(uid)}
                    canDelete={!!me && (me.uid === c.authorId || adminUids.includes(me.uid))}
                    onDelete={() => {
                      setModalOpen(false);
                      openConfirm('Xoá bình luận này và toàn bộ phản hồi của nó?', async () => {
                        const children = repliesByParent[c.id] || [];
                        await Promise.all(children.map(rr => deleteDoc(doc(db, 'comments', rr.id))));
                        await deleteDoc(doc(db, 'comments', c.id));
                        try { if (c.authorId) await updateDoc(doc(db, 'users', c.authorId), { 'stats.comments': increment(-1 - children.length) }); } catch {}
                      });
                    }}
                    onToggleLike={()=>toggleLike(c)}
                  />

                  <ReplyBox
                    me={me}
                    postId={postId}
                    parent={c}
                    adminUids={adminUids}
                    postTitle={postTitle}
                    onNeedVerify={openVerifyPrompt}
                    onNeedLogin={openLoginPrompt}
                  />

                  {replies.map((r) => (
                    <div key={r.id} id={`c-${r.id}`} className="mt-3 pl-4 border-l-2 border-sky-200 dark:border-sky-800 scroll-mt-24">
                      <CommentRow
                        c={r}
                        me={me}
                        small
                        isAdminFn={(uid)=>adminUids.includes(uid)}
                        canDelete={!!me && (me.uid === r.authorId || adminUids.includes(me.uid))}
                        onDelete={() => {
                          openConfirm('Bạn có chắc muốn xoá phản hồi này?', async () => {
                            await deleteDoc(doc(db, 'comments', r.id));
                            try { if (r.authorId) await updateDoc(doc(db, 'users', r.authorId), { 'stats.comments': increment(-1) }); } catch {}
                          });
                        }}
                        onToggleLike={()=>toggleLike(r)}
                      />
                      <ReplyBox
                        me={me}
                        postId={postId}
                        parent={c}
                        replyingTo={r}
                        adminUids={adminUids}
                        postTitle={postTitle}
                        onNeedVerify={openVerifyPrompt}
                        onNeedLogin={openLoginPrompt}
                      />
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========= One comment row ========= */
function CommentRow({ c, me, small = false, isAdminFn, canDelete, onDelete, onToggleLike }) {
  const isAdmin = isAdminFn?.(c.authorId);
  const hasLiked = Array.isArray(c.likedBy) && c.likedBy.includes(me?.uid);
  const likeCount = c.likeCount || 0;
  const dt = formatDate(c.createdAt);
  const avatar = c.userPhoto || '';
  const userName = c.userName || 'Người dùng';

  // Nếu là nick của chính mình → /profile; người khác → /users/[uid] (giống yêu cầu)
  const profileHref = me?.uid && c.authorId === me.uid ? '/profile' : `/users/${c.authorId}`;

  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 ${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full border border-sky-200 dark:border-sky-700 flex items-center justify-center bg-sky-50 dark:bg-sky-900/40`}>
        {avatar
          ? <img src={avatar} alt="avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
          : <FontAwesomeIcon icon={faUserCircle} className={`${small ? 'w-5 h-5' : 'w-6 h-6'} text-sky-500`} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {c.authorId ? (
            <Link href={profileHref} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors">
              {userName}
            </Link>
          ) : (
            <span className="font-semibold text-gray-900 dark:text-gray-100">{userName}</span>
          )}

          {isAdmin && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">Admin</span>
          )}

          <span className="text-xs text-gray-500 dark:text-gray-400" title={dt?.abs}>
            {dt?.rel}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onToggleLike}
              className={`text-xs inline-flex items-center gap-1 px-2 py-1 rounded-lg border
                ${hasLiked ? 'bg-rose-600 text-white border-rose-600' : 'border-gray-300 hover:bg-rose-50 dark:border-gray-700 dark:hover:bg-rose-900/20'}`}
              title={hasLiked ? 'Bỏ thích' : 'Thích'}
            >
              <FontAwesomeIcon icon={faHeart} />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {canDelete && (
              <button onClick={onDelete} className="text-xs text-rose-500 hover:text-rose-700" title="Xoá">
                <FontAwesomeIcon icon={faTrash} />
              </button>
            )}
          </div>
        </div>

        <div className="mt-2 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
          {c.content}
        </div>
      </div>
    </div>
  );
}

/* ========= Reply box ========= */
function ReplyBox({ me, postId, parent, replyingTo=null, adminUids, postTitle, onNeedVerify, onNeedLogin }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const target = replyingTo || parent;
  const canReply = !!me && me.uid !== (target?.authorId ?? '');

  const onReply = async (e) => {
    e.preventDefault();
    if (!me) { onNeedLogin?.(); return; }
    if (!me.emailVerified) { onNeedVerify?.(); return; }
    if (!canReply || !text.trim()) return;

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
    setText('');
    setOpen(false);

    try { await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) }); } catch {}

    // Notify người bị trả lời (không tự notify chính mình)
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
      await bumpCounter(target.authorId, +1);
    }
    // Notify admin khác
    const targets = (adminUids || []).filter(u => u !== me.uid && u !== target.authorId);
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
      await bumpCounter(uid, +1);
    }));
  };

  if (!me) {
    return (
      <div className="mt-2">
        <button onClick={() => onNeedLogin?.()} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      </div>
    );
  }
  if (me.uid === (target?.authorId ?? '')) return null;

  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => {
          if (!me) { onNeedLogin?.(); return; }
          if (!me.emailVerified) { onNeedVerify?.(); return; }
          setOpen(true);
        }} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ) : (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          {target && (
            <div className="text-[12px] text-gray-700 dark:text-gray-300 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 border border-sky-100 dark:border-sky-800 rounded-xl p-2">
              {target.authorId ? (
                <Link
                  href={me && target.authorId === me.uid ? '/profile' : `/users/${target.authorId}`}
                  className="font-medium hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
                >
                  {target.userName || 'Người dùng'}
                </Link>
              ) : (
                <span className="font-medium">{target.userName || 'Người dùng'}</span>
              )}
              : {excerpt(target.content, 160)}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            // iOS zoom fix
            className="w-full min-h-[72px] border border-indigo-200 dark:border-indigo-900 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none shadow-[0_0_0_1px_rgba(129,140,248,0.25)]"
            placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName || 'người dùng') : (parent.userName || 'người dùng')}…`}
            maxLength={2000}
            onFocus={() => { if (me && !me.emailVerified) onNeedVerify?.(); }}
          />
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => { setOpen(false); setText(''); }} className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
              Huỷ
            </button>
            <button type="submit" className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95 inline-flex items-center gap-2">
              Gửi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
