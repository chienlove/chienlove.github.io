import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function NotificationsBell({ onClick }) {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    // Đếm trực tiếp số thông báo chưa đọc để badge luôn chuẩn
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => setUnread(snap.size));
    return () => unsub();
  }, [user]);

  return (
    <button
      onClick={onClick}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
      aria-label="Notifications"
    >
      {/* thay bằng icon bạn thích */}
      <span className="material-icons text-gray-800 dark:text-gray-200">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[11px] leading-none bg-red-600 text-white rounded-full px-1">
          {unread}
        </span>
      )}
    </button>
  );
}