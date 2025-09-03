// components/Comments.js
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, where,
  arrayUnion, arrayRemove, increment
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faReply, faTrash, faUserCircle, faQuoteLeft, faHeart
} from '@fortawesome/free-solid-svg-icons';

/* ========= Helpers ========= */
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
    if (ts.seconds) d = new Date(ts.seconds * 1000);
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

/* ========= Notifications helper ========= */
async function createNotification(payload = {}) {
  const { toUserId, type, postId, commentId, fromUserId, ...extra } = payload;
  await addDoc(collection(db, 'notifications'), {
    toUserId,
    type,           // 'comment' | 'reply' | 'like'
    postId,
    commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    fromUserId,
    ...extra,
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

/* ========= Đảm bảo có users/{uid} & KHÔNG ghi đè createdAt ========= */
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
    // Tạo mới: có createdAt + khởi tạo stats
    await setDoc(uref, {
      ...base,
      createdAt: serverTimestamp(),   // <-- chỉ set lần đầu
      stats: { comments: 0, likesReceived: 0 },
    }, { merge: true });
  } else {
    // Đã tồn tại: chỉ cập nhật thông tin cơ bản, không đụng createdAt
    await setDoc(uref, base, { merge: true });
  }
}

/* ========= Modal trung tâm (alert + confirm) ========= */
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

/* ========= Verified badge dạng X ========= */
const VerifiedBadgeX = ({ className = '' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`inline-block ${className}`} fill="#1d9bf0">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

/* ==================== Component chính ==================== */
export default function Comments({ postId, postTitle }) {
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal center
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  // ===== Helpers mở modal
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
    const openHeaderLoginPopup = () => {
  if (typeof window === 'undefined') return;

  const fireOpenAuth = () => {
    try { window.dispatchEvent(new Event('open-auth')); } catch {}
  };

  try {
    if (typeof window.openLogin === 'function') {
      window.openLogin();               // mở popup login của Layout
      setTimeout(fireOpenAuth, 0);      // rồi mở thẳng form đăng nhập
    } else {
      window.dispatchEvent(new Event('open-login')); // fallback nếu không có window.openLogin
      setTimeout(fireOpenAuth, 0);
    }
  } catch {}
};

  const openLoginPrompt = () => {
    setModalTitle('Cần đăng nhập');
    setModalContent(<p>Bạn cần <b>đăng nhập</b> để thực hiện thao tác này.</p>);
    setModalTone('info');
    setModalActions(
      <>
        <button
          onClick={() => { setModalOpen(false); openHeaderLoginPopup(); }}
          className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90"
        >
          Đăng nhập
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

  // vá comment cũ thiếu tên/ảnh của chính mình
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

  // ===== Submit bình luận (chỉ chặn nếu chưa verify)
  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me) { openLoginPrompt(); return; }
    if (!me.emailVerified) { openVerifyPrompt(); return; }
    if (!content.trim()) return;

    await ensureUserDoc(me); // tạo user doc nếu chưa có (không ghi đè createdAt)

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

    // Cập nhật thống kê: +1 bình luận
    await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) });

    // Gửi noti cho admin khác (tránh tự notify chính mình)
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

  // ===== Toggle ❤️ like + cập nhật likesReceived
  const toggleLike = async (c) => {
    if (!me) { openLoginPrompt(); return; }
    const cid = c.id;
    const ref = doc(db, 'comments', cid);
    const hasLiked = Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
    try {
      await updateDoc(ref, {
        likedBy: hasLiked ? arrayRemove(me.uid) : arrayUnion(me.uid),
        likeCount: increment(hasLiked ? -1 : +1),
      });

      // cập nhật tổng likesReceived cho TÁC GIẢ bình luận
      if (c.authorId) {
        await updateDoc(doc(db, 'users', c.authorId), {
          'stats.likesReceived': increment(hasLiked ? -1 : +1)
        });
      }

      // tạo noti khi LIKE (không phải bỏ like) & không notify khi tự-like
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
    items.forEach(c => {
      if (c.parentId) (m[c.parentId] ||= []).push(c);
    });
    Object.values(m).forEach(arr => arr.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)));
    return m;
  }, [items]);

  return (
    <div className="mt-6">
      {/* Centered Modal */}
      <CenterModal open={modalOpen} title={modalTitle} onClose={() => setModalOpen(false)} actions={modalActions} tone={modalTone}>
        {modalContent}
      </CenterModal>

      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Bình luận</h3>

      {!me ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Hãy đăng nhập để bình luận.</div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            // iOS zoom fix: font-size >= 16px
            className="w-full min-h-[96px] border border-sky-200 dark:border-sky-900 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500/40 outline-none shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
            placeholder="Viết bình luận..."
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
                    onDelete={async () => {
                      openConfirm('Xoá bình luận này và toàn bộ phản hồi của nó?', async () => {
                        const toDelete = [c, ...(repliesByParent[c.id] || [])];
                        // trừ thống kê cho từng author ứng với comment bị xoá
                        await Promise.all(toDelete.map(async (it) => {
                          if (it.authorId) {
                            try { await updateDoc(doc(db, 'users', it.authorId), { 'stats.comments': increment(-1) }); } catch {}
                          }
                          try { await deleteDoc(doc(db, 'comments', it.id)); } catch {}
                        }));
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

                  {/* Danh sách phản hồi */}
                  {replies.map((r) => {
                    const target = r.replyToUserId === c.authorId
                      ? c
                      : replies.find(x => x.authorId === r.replyToUserId) || null;
                    return (
                      <div
                        key={r.id}
                        id={`c-${r.id}`}
                        className="mt-3 pl-4 border-l-2 border-sky-200 dark:border-sky-800 scroll-mt-24"
                      >
                        <CommentRow
                          c={r}
                          me={me}
                          small
                          isAdminFn={(uid)=>adminUids.includes(uid)}
                          quoteFrom={target}
                          canDelete={!!me && (me.uid === r.authorId || adminUids.includes(me.uid))}
                          onDelete={() => {
                            openConfirm('Bạn có chắc muốn xoá phản hồi này?', async () => {
                              try {
                                await deleteDoc(doc(db, 'comments', r.id));
                                if (r.authorId) {
                                  await updateDoc(doc(db, 'users', r.authorId), { 'stats.comments': increment(-1) });
                                }
                              } catch {}
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
                    );
                  })}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ========= CommentRow ========= */
function CommentRow({ c, me, small = false, isAdminFn, quoteFrom, canDelete, onDelete, onToggleLike }) {
  const isAdmin = isAdminFn?.(c.authorId);
  const hasLiked = Array.isArray(c.likedBy) && c.likedBy.includes(me?.uid);
  const likeCount = c.likeCount || 0;
  const dt = formatDate(c.createdAt);
  const avatar = c.userPhoto || '';
  const userName = c.userName || 'Người dùng';
  const isSelf = !!me && c.authorId === me.uid;

  const NameLink = ({ uid, children }) => {
    if (!uid) return <span className="font-semibold text-gray-900 dark:text-gray-100">{children}</span>;
    // chính mình → /profile ; người khác → /users/[uid]
    const href = isSelf ? '/profile' : `/users/${uid}`;
    return (
      <Link
        href={href}
        className="font-semibold text-gray-900 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
      >
        {children}
      </Link>
    );
  };

  return (
    <div className="flex gap-3">
      <div className={`flex-shrink-0 ${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full border border-sky-200 dark:border-sky-700 flex items-center justify-center bg-sky-50 dark:bg-sky-900/40`}>
        {avatar ? (
          <img src={avatar} alt="avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <FontAwesomeIcon icon={faUserCircle} className={`${small ? 'w-5 h-5' : 'w-6 h-6'} text-sky-500`} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <NameLink uid={c.authorId}>{userName}</NameLink>

          {isAdmin && (
            <span className="inline-flex items-center justify-center translate-y-[0.5px]" title="Quản trị viên đã xác minh">
              <VerifiedBadgeX className="w-4 h-4 shrink-0" />
            </span>
          )}

          <span className="text-xs text-gray-500 dark:text-gray-400" title={dt?.abs}>
            {dt?.rel}
          </span>

          {canDelete && (
            <button
              onClick={onDelete}
              className="text-xs text-rose-600 hover:text-rose-700 ml-auto inline-flex items-center gap-1"
              title="Xoá"
            >
              <FontAwesomeIcon icon={faTrash} />
              Xoá
            </button>
          )}
        </div>

        {/* Quote (nếu là reply) */}
        {quoteFrom && quoteFrom.id !== c.id && (
          <div className="mt-2 text-[13px] text-gray-700 dark:text-gray-300 bg-gradient-to-r from-sky-50 to-rose-50 dark:from-sky-900/20 dark:to-rose-900/20 border border-sky-100 dark:border-sky-800 rounded-xl p-2">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <FontAwesomeIcon icon={faQuoteLeft} className="w-3.5 h-3.5 text-sky-500" />
              {quoteFrom.authorId ? (
                <Link
                  href={me && quoteFrom.authorId === me.uid ? '/profile' : `/users/${quoteFrom.authorId}`}
                  className="font-medium hover:text-sky-600 dark:hover:text-sky-400 hover:underline transition-colors"
                >
                  {quoteFrom.userName || 'Người dùng'}
                </Link>
              ) : (
                <span className="font-medium">{quoteFrom.userName || 'Người dùng'}</span>
              )}
            </div>
            <div className="whitespace-pre-wrap break-words">{excerpt(quoteFrom.content, 200)}</div>
          </div>
        )}

        <div className="mt-2 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
          {c.content}
        </div>

        {/* Nút Like */}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={onToggleLike}
            className={`inline-flex items-center gap-1 text-sm transition-colors rounded-lg px-2 py-1
              ${hasLiked 
                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30 dark:hover:bg-rose-900/40' 
                : 'text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-400 dark:hover:text-rose-300 dark:hover:bg-rose-900/20'
              }`}
            title={hasLiked ? 'Bỏ thích' : 'Thích'}
          >
            <FontAwesomeIcon icon={faHeart} />
            {likeCount > 0 && <span>{likeCount}</span>}
          </button>
        </div>
      </div>
    </div>
  );
}

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

    await ensureUserDoc(me); // tạo user doc nếu chưa có

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

    // +1 bình luận cho người trả lời
    await updateDoc(doc(db, 'users', me.uid), { 'stats.comments': increment(1) });

    // Notify người bị trả lời
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
            <button
              type="button"
              onClick={() => { setOpen(false); setText(''); }}
              className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:opacity-95 inline-flex items-center gap-2"
            >
              Gửi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}