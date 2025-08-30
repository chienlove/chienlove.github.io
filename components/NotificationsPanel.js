import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  collection, doc, limit, onSnapshot, orderBy, query,
  updateDoc, where, writeBatch, runTransaction,
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

  const decCounter = async (uid, amount = 1) => {
    // vẫn hỗ trợ giảm user_counters nếu bạn đang dùng (không bắt buộc với badge mới)
    const counterRef = doc(db, 'user_counters', uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
      const next = Math.max(0, cur - amount);
      tx.set(counterRef, { unreadCount: next }, { merge: true });
    });
  };

  const markRead = async (id, isRead) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
    if (!isRead) await decCounter(user.uid, 1);
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = items.filter(i => !i.isRead).map(i => i.id);
    if (unreadIds.length === 0) return;
    const batch = writeBatch(db);
    unreadIds.forEach((nid) => batch.update(doc(db, 'notifications', nid), { isRead: true }));
    await batch.commit();
    await decCounter(user.uid, unreadIds.length);
  };

  if (!open) return null;

  return (
    // DÙNG fixed để không lệch & không bị khuyết trên mobile
    <div className="fixed right-3 top-14 z-50 w-[22rem] max-w-[92vw]">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl overflow-hidden">
        <div className="px-3 py-2 flex justify-between items-center border-b border-gray-100 dark:border-gray-800">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Thông báo</h4>
          <div className="flex items-center gap-2">
            <button
              onClick={markAllRead}
              className="text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              Đánh dấu tất cả đã đọc
            </button>
            <button onClick={onClose} className="text-sm text-gray-600 dark:text-gray-300 hover:underline">
              Đóng
            </button>
          </div>
        </div>

        <ul className="space-y-2 max-h-[65vh] overflow-auto p-3">
          {items.length === 0 && (
            <li className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">Chưa có thông báo</li>
          )}

          {items.map((n) => (
            <li key={n.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex justify-between items-center bg-white/60 dark:bg-gray-900/60">
              <div className="pr-3">
                <div className="text-[13px] text-gray-800 dark:text-gray-200 font-medium">
                  {n.type === 'reply' ? 'Có trả lời bình luận' : 'Hoạt động mới'}
                </div>
                {/* Đúng routing: /<slug>?comment=<id>#c-<id> */}
                <Link
                  href={`/${n.postId}?comment=${n.commentId}#c-${n.commentId}`}
                  onClick={() => !n.isRead && markRead(n.id, n.isRead)}
                  className="text-blue-600 dark:text-blue-400 text-sm underline"
                >
                  Xem chi tiết
                </Link>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => markRead(n.id, n.isRead)}
                  className="text-xs px-2 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded"
                >
                  Đã đọc
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}