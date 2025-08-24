import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import Link from 'next/link';

export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(setUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(q, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user, open]);

  const markRead = async (id) => {
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
  };

  return open ? (
    <div className="absolute right-4 top-12 w-96 bg-white border rounded shadow-lg p-3 z-50">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold">Thông báo</h4>
        <button onClick={onClose} className="text-sm">Đóng</button>
      </div>
      <ul className="space-y-2 max-h-[60vh] overflow-auto">
        {items.map((n) => (
          <li key={n.id} className="border rounded p-2 flex justify-between items-center">
            <div className="pr-3">
              <div className="text-sm">
                {n.type === 'reply' ? 'Có trả lời bình luận' : 'Hoạt động mới'}
              </div>
              {/* Điều hướng về trang bài viết; bạn có thể đổi link theo slug của bạn */}
              <Link
                href={`/post/${n.postId}?comment=${n.commentId}`}
                className="text-blue-600 text-sm underline"
              >
                Xem chi tiết
              </Link>
            </div>
            {!n.isRead && (
              <button
                onClick={() => markRead(n.id)}
                className="text-xs px-2 py-1 bg-gray-800 text-white rounded"
              >
                Đã đọc
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  ) : null;
}