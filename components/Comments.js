// components/Comments.js
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, doc, getDoc, limit, onSnapshot,
  orderBy, query, runTransaction, serverTimestamp, where
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faReply, faUserCircle } from '@fortawesome/free-solid-svg-icons';

export default function Comments({ postId }) {
  const [me, setMe] = useState(null);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adminUids, setAdminUids] = useState([]);

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  // Load admin UID list once
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, 'app_config', 'admins'));
        if (snap.exists()) setAdminUids(Array.isArray(snap.data().uids) ? snap.data().uids : []);
      } catch {}
    })();
  }, []);

  // Realtime comments for post
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', String(postId)),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  const nameOf = (user) =>
    user?.displayName ||
    user?.email?.split('@')[0] ||
    'Người dùng';

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!me || !content.trim()) return;

    // 1) Tạo root comment
    const payload = {
      postId: String(postId),
      parentId: null,
      authorId: me.uid,
      userName: nameOf(me),
      userPhoto: me.photoURL || '',
      content: content.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: null
    };
    const ref = await addDoc(collection(db, 'comments'), payload);
    setContent('');

    // 2) Gửi noti cho admin
    await notifyAdmins({
      adminUids,
      excludeUids: [me.uid],
      postId: String(postId),
      commentId: ref.id,
      fromUserId: me.uid
    });
  };

  return (
    <div className="mt-6">
      <h3 className="font-bold mb-3">Bình luận</h3>

      {me ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Viết bình luận..."
            maxLength={3000}
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Gửi
          </button>
        </form>
      ) : (
        <div className="text-sm text-gray-600">Hãy đăng nhập để bình luận.</div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500">Đang tải bình luận…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa có bình luận.</div>
        ) : (
          <ul className="space-y-4">
            {items
              .filter(c => !c.parentId)
              .map(root => (
                <li key={root.id} className="border rounded p-3">
                  <CommentRow c={root} />
                  <ReplySection
                    me={me}
                    postId={postId}
                    parent={root}
                    adminUids={adminUids}
                  />
                  {/* Replies */}
                  <div className="mt-3 space-y-3 pl-4 border-l">
                    {items
                      .filter(r => r.parentId === root.id)
                      .sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0))
                      .map(r => (
                        <div key={r.id} className="bg-gray-50 dark:bg-gray-800/50 rounded p-2">
                          <CommentRow c={r} small />
                          {/* Reply-to-reply (tối giản: 1 cấp); vẫn cho phép respond vào parent gốc */}
                          <ReplySection
                            me={me}
                            postId={postId}
                            parent={root}
                            replyingTo={r}
                            adminUids={adminUids}
                          />
                        </div>
                      ))}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function CommentRow({ c, small=false }) {
  const hasAvatar = !!c.userPhoto;
  return (
    <div className="flex items-start gap-3">
      {hasAvatar ? (
        <img
          src={c.userPhoto}
          alt="avatar"
          className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full object-cover`}
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-gray-200 flex items-center justify-center`}>
          <FontAwesomeIcon icon={faUserCircle} className={`${small ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>
      )}
      <div className="flex-1">
        <div className={`font-medium ${small ? 'text-sm' : ''}`}>{c.userName || 'Người dùng'}</div>
        <div className="mt-1 whitespace-pre-wrap break-words">{c.content}</div>
      </div>
    </div>
  );
}

function ReplySection({ me, postId, parent, replyingTo=null, adminUids }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const canReply = !!me && me.uid !== (replyingTo?.authorId || parent.authorId);

  const onReply = async (e) => {
    e.preventDefault();
    if (!canReply || !text.trim()) return;

    // 1) Tạo reply (đính kèm tên & ảnh)
    const replyRef = await addDoc(collection(db, 'comments'), {
      postId: String(postId),
      parentId: parent.id,
      authorId: me.uid,
      userName: me.displayName || me.email?.split('@')[0] || 'Người dùng',
      userPhoto: me.photoURL || '',
      content: text.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: replyingTo?.authorId || parent.authorId || null
    });
    setText('');
    setOpen(false);

    // 2) Noti cho chủ comment (nếu khác mình)
    const ownerUid = replyingTo?.authorId || parent.authorId;
    if (ownerUid && ownerUid !== me.uid) {
      await createNotification({
        toUserId: ownerUid,
        type: 'reply',
        postId: String(postId),
        commentId: replyRef.id,
        fromUserId: me.uid
      });
      await bumpCounter(ownerUid, +1);
    }

    // 3) Noti cho admin (không trùng mình / không trùng owner)
    await notifyAdmins({
      adminUids,
      excludeUids: [me.uid, ownerUid].filter(Boolean),
      postId: String(postId),
      commentId: replyRef.id,
      fromUserId: me.uid
    });
  };

  if (!canReply) return null;

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:underline"
        >
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ) : (
        <form onSubmit={onReply} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded px-3 py-1"
            placeholder="Viết phản hồi…"
            maxLength={3000}
            autoFocus
          />
          <button className="px-3 py-1 bg-gray-800 text-white rounded">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Gửi
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded border">
            Hủy
          </button>
        </form>
      )}
    </div>
  );
}

/* ====== helpers: notifications & counters ====== */

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
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(ref, { unreadCount: Math.max(0, cur + delta) }, { merge: true });
  });
}

async function notifyAdmins({ adminUids = [], excludeUids = [], postId, commentId, fromUserId }) {
  const targets = adminUids.filter(u => !excludeUids.includes(u));
  await Promise.all(targets.map(async (uid) => {
    await createNotification({ toUserId: uid, type: 'comment', postId, commentId, fromUserId });
    await bumpCounter(uid, +1);
  }));
}