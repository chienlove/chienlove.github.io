import { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc,
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
  Timestamp,
} from 'firebase/firestore';

export default function Comments({ postId }) {
  const [user, setUser] = useState(null);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  // Realtime comments of a post
  useEffect(() => {
    if (!postId) return;
    setLoading(true);
    const q = query(
      collection(db, 'comments'),
      where('postId', '==', String(postId)),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, [postId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    await addDoc(collection(db, 'comments'), {
      postId: String(postId),
      parentId: null,
      authorId: user.uid,
      content: content.trim(),
      createdAt: serverTimestamp(),
      replyToUserId: null, // reply sẽ set ở form ReplyBox
    });
    setContent('');
  };

  return (
    <div className="mt-6">
      <h3 className="font-bold mb-3">Bình luận</h3>

      {user ? (
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 border rounded px-3 py-2"
            placeholder="Viết bình luận..."
            maxLength={5000}
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded">
            Gửi
          </button>
        </form>
      ) : (
        <div className="text-sm text-gray-600">
          Hãy đăng nhập để bình luận.
        </div>
      )}

      <div className="mt-4">
        {loading ? (
          <div className="text-sm text-gray-500">Đang tải bình luận…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">Chưa có bình luận.</div>
        ) : (
          <ul className="space-y-3">
            {items.map((c) => (
              <li key={c.id} id={`c-${c.id}`} className="border rounded p-3">
                <div className="text-xs text-gray-500">
                  {formatTS(c.createdAt)}
                </div>
                <div className="mt-1 whitespace-pre-wrap break-words">
                  {c.content}
                </div>

                {user && user.uid !== c.authorId && (
                  <ReplyBox postId={postId} parent={c} currentUser={user} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ReplyBox({ postId, parent, currentUser }) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onReply = async (e) => {
    e.preventDefault();
    if (!text.trim() || !currentUser) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        postId: String(postId),
        parentId: parent.id,
        authorId: currentUser.uid,
        content: text.trim(),
        createdAt: serverTimestamp(),
        replyToUserId: parent.authorId || null, // quan trọng để tạo thông báo
      });
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onReply} className="mt-2 flex gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="flex-1 border rounded px-3 py-1"
        placeholder="Trả lời…"
        maxLength={5000}
      />
      <button
        disabled={submitting}
        className="px-3 py-1 bg-gray-800 text-white rounded disabled:opacity-60"
      >
        Reply
      </button>
    </form>
  );
}

function formatTS(ts) {
  try {
    if (!ts) return '';
    const d =
      ts instanceof Timestamp
        ? ts.toDate()
        : ts?.seconds
        ? new Date(ts.seconds * 1000)
        : new Date(ts);
    return d.toLocaleString();
  } catch {
    return '';
  }
}