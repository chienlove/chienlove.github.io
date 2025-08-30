import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, updateDoc, where
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faReply, faTrash, faUserCircle } from '@fortawesome/free-solid-svg-icons';

/* ---------- helpers ---------- */
function preferredName(user) {
  if (!user) return 'Người dùng';
  const p0 = user.providerData?.[0];
  return user.displayName || user.email || p0?.displayName || p0?.email || 'Người dùng';
}
function preferredPhoto(user) {
  return user?.photoURL || user?.providerData?.[0]?.photoURL || '';
}

async function createNotification({ toUserId, type, postId, commentId, fromUserId }) {
  await addDoc(collection(db, 'notifications'), {
    toUserId,
    type,
    postId,
    commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    fromUserId
  });
}
async function bumpCounter(uid, delta) {
  // Tuỳ bạn còn dùng user_counters hay không; giữ lại để tương thích
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(ref, { unreadCount: Math.max(0, cur + delta) }, { merge: true });
  });
}

/* ---------- main component ---------- */
export default function Comments({ postId }) {
  const [me, setMe] = useState(null);
  const [adminUids, setAdminUids] = useState([]);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // realtime comments
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

  // patch comment cũ của chính mình nếu thiếu tên/ảnh
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

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me || !content.trim()) return;

    const payload = {
      postId: String(postId),
      parentId: null,
      authorId: me.uid,
      userName: preferredName(me),
      userPhoto: preferredPhoto(me),
      content: content.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: null
    };
    const ref = await addDoc(collection(db, 'comments'), payload);
    setContent('');

    // notify all admins (trừ chính mình)
    const targetAdmins = adminUids.filter(u => u !== me.uid);
    await Promise.all(targetAdmins.map(async (uid) => {
      await createNotification({ toUserId: uid, type: 'comment', postId: String(postId), commentId: ref.id, fromUserId: me.uid });
      await bumpCounter(uid, +1);
    }));
  };

  // tách root & replies
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
      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Bình luận</h3>

      {me ? (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full min-h-[96px] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-[15px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
            placeholder="Viết bình luận..."
            maxLength={3000}
          />
          <div className="flex justify-end">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-95">
              Gửi
            </button>
          </div>
        </form>
      ) : (
        <div className="text-sm text-gray-700 dark:text-gray-300">Hãy đăng nhập để bình luận.</div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải bình luận…</div>
        ) : roots.length === 0 ? (
          <div className="text-sm text-gray-500 dark:text-gray-400">Chưa có bình luận.</div>
        ) : (
          <ul className="space-y-4">
            {roots.map((c) => (
              <li key={c.id} id={`c-${c.id}`} className="border border-gray-200 dark:border-gray-800 rounded-xl p-3 scroll-mt-24 bg-white dark:bg-gray-900">
                <CommentRow
                  c={c}
                  me={me}
                  canDelete={!!me && (me.uid === c.authorId || isAdmin(me.uid))}
                  onDelete={async () => {
                    const r = repliesByParent[c.id] || [];
                    await Promise.all(r.map(rr => deleteDoc(doc(db, 'comments', rr.id))));
                    await deleteDoc(doc(db, 'comments', c.id));
                  }}
                />
                {/* hộp reply cho comment gốc */}
                <ReplyBox me={me} postId={postId} parent={c} adminUids={adminUids} />

                {/* replies */}
                {(repliesByParent[c.id] || []).map((r) => (
                  <div key={r.id} id={`c-${r.id}`} className="mt-3 pl-4 border-l border-gray-200 dark:border-gray-800 scroll-mt-24">
                    <CommentRow
                      c={r}
                      me={me}
                      small
                      canDelete={!!me && (me.uid === r.authorId || isAdmin(me.uid))}
                      onDelete={async () => {
                        await deleteDoc(doc(db, 'comments', r.id));
                      }}
                    />
                    <ReplyBox me={me} postId={postId} parent={c} replyingTo={r} adminUids={adminUids} />
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentRow({ c, me, small=false, canDelete=false, onDelete }) {
  const avatar = c.userPhoto;
  const name = c.userName || (me && me.uid === c.authorId ? preferredName(me) : 'Người dùng');
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
        <div className={`flex items-center gap-3 ${small ? 'text-sm' : 'text-[15px]'}`}>
          {/* tên tài khoản: xanh đậm/dễ đọc */}
          <span className="font-semibold text-blue-800 dark:text-blue-300">{name}</span>
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-red-600 inline-flex items-center gap-1 hover:underline">
              <FontAwesomeIcon icon={faTrash} />
              Xoá
            </button>
          )}
        </div>
        {/* nội dung: xám đậm để readable */}
        <div className="mt-1 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">
          {c.content}
        </div>
      </div>
    </div>
  );
}

function ReplyBox({ me, postId, parent, replyingTo=null, adminUids }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const target = replyingTo || parent;                 // comment đang được reply
  const canReply = !!me && me.uid !== target.authorId; // không reply chính mình

  const onReply = async (e) => {
    e.preventDefault();
    if (!canReply || !text.trim()) return;

    const ref = await addDoc(collection(db, 'comments'), {
      postId: String(postId),
      parentId: parent.id, // luôn gắn vào comment gốc
      authorId: me.uid,
      userName: preferredName(me),
      userPhoto: preferredPhoto(me),
      content: text.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: target.authorId || null
    });
    setText('');
    setOpen(false);

    // notify owner
    if (target.authorId && target.authorId !== me.uid) {
      await createNotification({ toUserId: target.authorId, type: 'reply', postId: String(postId), commentId: ref.id, fromUserId: me.uid });
      await bumpCounter(target.authorId, +1);
    }
    // notify admins (trừ mình & trừ owner)
    const targets = adminUids.filter(u => u !== me.uid && u !== target.authorId);
    await Promise.all(targets.map(async (uid) => {
      await createNotification({ toUserId: uid, type: 'comment', postId: String(postId), commentId: ref.id, fromUserId: me.uid });
      await bumpCounter(uid, +1);
    }));
  };

  if (!canReply) return null;

  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ) : (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full min-h-[72px] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-[15px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
            placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName || 'người dùng') : (parent.userName || 'người dùng')}…`}
            maxLength={3000}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg">
              <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
              Gửi
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300">
              Hủy
            </button>
          </div>
        </form>
      )}
    </div>
  );
}