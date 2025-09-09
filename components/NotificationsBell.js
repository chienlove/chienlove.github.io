// components/NotificationsBell.js
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function NotificationsBell({ onClick }) {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      where('isRead', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => {
      const newUnread = snap.size;
      // Trigger animation when unread count increases
      if (newUnread > unread) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 1000);
      }
      setUnread(newUnread);
    });
    return () => unsub();
  }, [user, unread]);

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-blue-100 hover:to-purple-100 dark:hover:from-blue-900/50 dark:hover:to-purple-900/50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
        isAnimating ? 'animate-bounce' : ''
      }`}
      aria-label="Notifications" 
      title="Thông báo"
    >
      {/* Icon chuông với gradient */}
      <div className="relative">
        <svg 
          className="w-5 h-5 text-gray-700 dark:text-gray-200" 
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path d="M10 2C7.8 2 6 3.8 6 6v3.5L4.5 11v1h11v-1L14 9.5V6c0-2.2-1.8-4-4-4zm0 16c1.1 0 2-.9 2-2H8c0 1.1.9 2 2 2z"/>
        </svg>
        
        {/* Hiệu ứng ring khi có thông báo mới */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping"></div>
        )}
      </div>

      {/* Badge số lượng thông báo chưa đọc */}
      {unread > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 rounded-full bg-gradient-to-br from-red-500 to-pink-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg animate-pulse">
          <span className="relative z-10">
            {unread > 99 ? '99+' : unread}
          </span>
          
          {/* Hiệu ứng glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-red-400 to-pink-400 opacity-75 animate-ping"></div>
        </div>
      )}

      {/* Hiệu ứng hover glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-400/0 to-purple-400/0 hover:from-blue-400/20 hover:to-purple-400/20 transition-all duration-300"></div>
    </button>
  );
}

