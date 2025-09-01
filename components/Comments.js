// components/Comments.js
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, updateDoc, where,
  arrayUnion, arrayRemove, increment
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane, faReply, faTrash, faUserCircle, faCheckCircle, faQuoteLeft, faHeart
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
    ...extra,       // fromUserName, fromUserPhoto, postTitle, commentText, ...
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

/* ========= Badge Verified kiểu X (Twitter) – chống méo ========= */
const VerifiedBadgeX = ({ className = '' }) => (
  <svg
    viewBox="0 0 512 512"
    preserveAspectRatio="xMidYMid meet"
    aria-label="Đã xác minh"
    role="img"
    className={`inline-block align-middle ${className}`}
  >
    {/* Nền "bông" xanh */}
    <path
      fill="#1DA1F2"
      d="M459.2 195.8l-33.6-45.8 6.2-56.8c1.9-17.9-17-30.2-32.9-22.1l-51.5 26.1-46.8-35.5c-13.2-10-31.2-10-44.4 0l-46.8 35.5-51.5-26.1c-15.9-8.1-34.8 4.2-32.9 22.1l6.2 56.8-33.6 45.8c-10.6 14.5-4.7 35 12 41.7l50.8 20.5-3.8 57.5c-1.1 17.2 15.9 29.8 31.8 22.7l52.7-23.8 52.7 23.8c15.9 7.2 32.9-5.5 31.8-22.7l-3.8-57.5 50.8-20.5c16.7-6.7 22.6-27.2 12-41.7z"
    />
    {/* Dấu tick trắng */}
    <path
      fill="#FFFFFF"
      d="M353 207l-15.9-15.9a12 12 0 00-17 0l-60.3 60.3-27.7-27.7a12 12 0 00-17 0L210.6 239a12 12 0 000 17l38.2 38.2a12 12 0 0017 0l81.6-81.6a12 12 0 000-17z"
    />
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
        <button
          onClick={() => setModalOpen(false)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white"
        >
          Huỷ
        </button>
        <button
          onClick={async () => { setModalOpen(false); await onConfirm(); }}
          className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700"
        >
          Xoá
        </button>
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
        <button
          onClick={() => setModalOpen(false)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white"
        >
          Để sau
        </button>
      </>
    );
    setModalOpen(true);
  };
  const openLoginPrompt = () => {
    setModalTitle('Cần đăng nhập');
    setModalContent(<p>Bạn cần <b>đăng nhập</b> để thực hiện thao tác này.</p>);
    setModalTone('info');
    setModalActions(
      <>
        <a
          href="/login"
          className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90"
        >
          Đăng nhập
        </a>
        <button
          onClick={() => setModalOpen(false)}
          className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white"
        >
          Để sau
        </button>
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

  // ===== Toggle ❤️ like + tạo notification khi like (không thông báo khi bỏ like hoặc tự-like)
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
      // tạo noti khi LIKE (không phải bỏ like) & không phải like chính mình
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
            className="w-full min-h-[96px] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-[15px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40 outline-none"
            placeholder="Viết bình luận..."
            maxLength={3000}
            onFocus={() => { if (me && !me.emailVerified) openVerifyPrompt(); }}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95 shadow-sm inline-flex items-center gap-2"
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
                <li key={c.id} id={`c-${c.id}`} className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 scroll-mt-24 bg-white dark:bg-gray-900">
                  <CommentRow
                    c={c}
                    me={me}
                    isAdminFn={(uid)=>adminUids.includes(uid)}
                    canDelete={!!me && (me.uid === c.authorId || adminUids.includes(me.uid))}
                    onDelete={() => {
                      openConfirm('Xoá bình luận này và toàn bộ phản hồi của nó?', async () => {
                        const r = repliesByParent[c.id] || [];
                        await Promise.all(r.map(rr => deleteDoc(doc(db, 'comments', rr.id))));
                        await deleteDoc(doc(db, 'comments', c.id));
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
                  {replies.map((r) => {
                    const target = r.replyToUserId === c.authorId
                      ? c
                      : replies.find(x => x.authorId === r.replyToUserId) || null;
                    return (
                      <div key={r.id} id={`c-${r.id}`} className="mt-3 pl-4 border-l border-gray-200 dark:border-gray-800 scroll-mt-24">
                        <CommentRow
                          c={r}
                          me={me}
                          small
                          isAdminFn={(uid)=>adminUids.includes(uid)}
                          quoteFrom={target}
                          canDelete={!!me && (me.uid === r.authorId || adminUids.includes(me.uid))}
                          onDelete={() => {
                            openConfirm('Bạn có chắc muốn xoá phản hồi này?', async () => {
                              await deleteDoc(doc(db, 'comments', r.id));
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

/* ==================== Hàng mục con ==================== */
function CommentRow({ c, me, small=false, canDelete=false, onDelete, isAdminFn=() => false, quoteFrom=null, onToggleLike }) {
  const avatar = c.userPhoto;
  const name = c.userName || (me && me.uid === c.authorId ? preferredName(me) : 'Người dùng');
  const time = formatDate(c.createdAt);
  const youLiked = !!me && Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
  const likeCount = Math.max(0, Number(c.likeCount || 0));

  return (
    <div className="flex items-start gap-3">
      {avatar ? (
        <img src={avatar} alt="" className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full object-cover`} referrerPolicy="no-referrer" />
      ) : (
        <div className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center`}>
          <FontAwesomeIcon icon={faUserCircle} className={`${small ? 'w-4 h-4' : 'w-5 h-5'} text-gray-600 dark:text-gray-300`} />
        </div>
      )}
      <div className="flex-1">
        <div className={`flex flex-wrap items-center gap-2 ${small ? 'text-[13px]' : 'text-[15px]'}`}>
          <span className="font-semibold text-blue-800 dark:text-blue-300 inline-flex items-center gap-1">
            {name}
            {isAdminFn(c.authorId) && (
              <span
                className="inline-flex items-center justify-center translate-y-[0.5px]"
                title="Quản trị viên đã xác minh"
              >
                <VerifiedBadgeX className="w-4 h-4 shrink-0" />
              </span>
            )}
          </span>
          {time && (
            <span className="text-xs text-gray-500" title={time.abs}>
              {time.rel}
            </span>
          )}

          {/* ❤️ Like (chỉ dùng faHeart solid để tránh lỗi gói regular) */}
          <button
            onClick={onToggleLike}
            className={`ml-2 inline-flex items-center gap-1 text-xs transition ${
              youLiked ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
            }`}
            title={youLiked ? 'Bỏ thích' : 'Thích'}
          >
            <FontAwesomeIcon icon={faHeart} className={`w-4 h-4 ${youLiked ? '' : 'opacity-60'}`} />
            <span>{likeCount}</span>
          </button>

          {canDelete && (
            <button onClick={onDelete} className="ml-auto text-xs text-red-600 inline-flex items-center gap-1 hover:underline">
              <FontAwesomeIcon icon={faTrash} />
              Xoá
            </button>
          )}
        </div>

        {/* Quote mục tiêu (nếu là reply) */}
        {quoteFrom && quoteFrom.id !== c.id && (
          <div className="mt-2 text-[13px] text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
            <div className="flex items-center gap-2 mb-1 opacity-80">
              <FontAwesomeIcon icon={faQuoteLeft} className="w-3.5 h-3.5" />
              <span className="font-medium">{quoteFrom.userName || 'Người dùng'}</span>
            </div>
            <div className="whitespace-pre-wrap break-words">{excerpt(quoteFrom.content, 200)}</div>
          </div>
        )}

        <div className="mt-2 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
          {c.content}
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
        <button onClick={() => onNeedLogin?.()} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:underline">
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
        }} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ) : (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          {target && (
            <div className="text-[12px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-lg p-2">
              <span className="font-medium">{target.userName || 'Người dùng'}:</span> {excerpt(target.content, 160)}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[72px] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-[15px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500/40 outline-none"
            placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName || 'người dùng') : (parent.userName || 'người dùng')}…`}
            maxLength={2000}
            onFocus={() => { if (me && !me.emailVerified) onNeedVerify?.(); }}
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setOpen(false); setText(''); }}
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white dark:bg.white dark:text-gray-900 hover:opacity-90 inline-flex items-center gap-2"
            >
              Gửi
            </button>
          </div>
        </form>
      )}
    </div>
  );
}