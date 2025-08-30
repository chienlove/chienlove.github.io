// components/Comments.js
import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs,
  limit, onSnapshot, orderBy, query, runTransaction, serverTimestamp,
  updateDoc, where
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faReply, faTrash, faUserCircle } from '@fortawesome/free-solid-svg-icons';

/* ---------- helpers ---------- */
function preferredName(user) {
  if (!user) return 'Người dùng';
  const p0 = user.providerData?.[0];
  return (
    user.displayName ||
    user.email ||
    p0?.displayName ||
    p0?.email ||
    'Người dùng'
  );
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

  // patch các comment cũ (chỉ của chính mình) nếu thiếu userName/userPhoto
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

  // build map replies
  const roots = items.filter(c => !c.parentId);
  const repliesByParent = useMemo(() => {
    const m = {};
    items.forEach(c => {
      if (c.parentId) {
        (m[c.parentId] ||= []).push(c);
      }
    });
    // sort replies oldest→newest
    Object.values(m).forEach(arr => arr.sort((a,b) => (a.createdAt?.seconds||0) - (b.createdAt?.seconds||0)));
    return m;
  }, [items]);

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
        ) : roots.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa có bình luận.</div>
        ) : (
          <ul className="space-y-4">
            {roots.map((c) => (
              <li key={c.id} className="border rounded p-3">
                <CommentRow
                  c={c}
                  me={me}
                  canDelete={!!me && (me.uid === c.authorId || isAdmin(me.uid))}
                  onDelete={async () => {
                    // xoá replies trước rồi xoá root
                    const r = repliesByParent[c.id] || [];
                    await Promise.all(r.map(rr => deleteDoc(doc(db, 'comments', rr.id))));
                    await deleteDoc(doc(db, 'comments', c.id));
                  }}
                />
                <ReplyBox
                  me={me}
                  postId={postId}
                  parent={c}
                  adminUids={adminUids}
                />
                {/* replies */}
                {(repliesByParent[c.id] || []).map((r) => (
                  <div key={r.id} className="mt-3 pl-4 border-l">
                    <CommentRow
                      c={r}
                      me={me}
                      small
                      canDelete={!!me && (me.uid === r.authorId || isAdmin(me.uid))}
                      onDelete={async () => {
                        await deleteDoc(doc(db, 'comments', r.id));
                      }}
                    />
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
        <div className={`${small ? 'w-7 h-7' : 'w-9 h-9'} rounded-full bg-gray-200 flex items-center justify-center`}>
          <FontAwesomeIcon icon={faUserCircle} className={`${small ? 'w-4 h-4' : 'w-5 h-5'}`} />
        </div>
      )}
      <div className="flex-1">
        <div className={`flex items-center gap-3 ${small ? 'text-sm' : ''}`}>
          <span className="font-medium">{name}</span>
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-red-600 inline-flex items-center gap-1 hover:underline">
              <FontAwesomeIcon icon={faTrash} />
              Xoá
            </button>
          )}
        </div>
        <div className="mt-1 whitespace-pre-wrap break-words">{c.content}</div>
      </div>
    </div>
  );
}

function ReplyBox({ me, postId, parent, adminUids }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const canReply = !!me && me.uid !== parent.authorId;

  const onReply = async (e) => {
    e.preventDefault();
    if (!canReply || !text.trim()) return;

    const ref = await addDoc(collection(db, 'comments'), {
      postId: String(postId),
      parentId: parent.id,
      authorId: me.uid,
      userName: preferredName(me),
      userPhoto: preferredPhoto(me),
      content: text.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: parent.authorId || null
    });
    setText('');
    setOpen(false);

    // notify owner
    if (parent.authorId && parent.authorId !== me.uid) {
      await createNotification({ toUserId: parent.authorId, type: 'reply', postId: String(postId), commentId: ref.id, fromUserId: me.uid });
      await bumpCounter(parent.authorId, +1);
    }
    // notify admins (trừ mình & trừ chủ comment nếu đã notify trên)
    const targets = adminUids.filter(u => u !== me.uid && u !== parent.authorId);
    await Promise.all(targets.map(async (uid) => {
      await createNotification({ toUserId: uid, type: 'comment', postId: String(postId), commentId: ref.id, fromUserId: me.uid });
      await bumpCounter(uid, +1);
    }));
  };

  if (!canReply) return null;

  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:underline">
          <FontAwesomeIcon icon={faReply} />
          Trả lời
        </button>
      ) : (
        <form onSubmit={onReply} className="flex gap-2 mt-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 border rounded px-3 py-1"
            placeholder="Viết phản hồi…"
            maxLength={3000}
            autoFocus
          />
          <button className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-60">
            <FontAwesomeIcon icon={faPaperPlane} className="mr-1" />
            Gửi
          </button>
          <button type="button" onClick={() => setOpen(false)} className="px-3 py-1 rounded border">Hủy</button>
        </form>
      )}
    </div>
  );
}