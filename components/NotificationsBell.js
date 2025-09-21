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
    // Bỏ 'unread' để tránh re-subscribe liên tục gây giật/nháy
  }, [user]);

  return (
    <button
      onClick={onClick}
      className={`relative flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 hover:from-orange-100 hover:to-red-100 dark:hover:from-orange-900/50 dark:hover:to-red-900/50 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-110 ${
        isAnimating ? 'animate-bounce' : ''
      } ${unread > 0 ? 'ring-2 ring-orange-300 dark:ring-orange-600' : ''}`}
      aria-label="Notifications" 
      title={`Thông báo${unread > 0 ? ` (${unread} chưa đọc)` : ''}`}
    >
      {/* Icon chuông với gradient */}
      <div className="relative">
        <svg 
          className={`w-6 h-6 transition-colors duration-300 ${
            unread > 0 
              ? 'text-orange-600 dark:text-orange-400' 
              : 'text-gray-700 dark:text-gray-200'
          }`}
          fill="currentColor" 
          viewBox="0 0 24 24"
        >
          <path d="M12 2C10.9 2 10 2.9 10 4v1.38c-2.83.48-5 2.94-5 5.87v3.75l-2 2v1h18v-1l-2-2V11.25c0-2.93-2.17-5.39-5-5.87V4c0-1.1-.9-2-2-2zm0 20c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2z"/>
        </svg>
        
        {/* Hiệu ứng ring khi có thông báo mới */}
        {isAnimating && (
          <div className="absolute inset-0 rounded-full border-2 border-orange-400 animate-ping"></div>
        )}
      </div>

      {/* Badge số lượng thông báo chưa đọc */}
      {unread > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-gradient-to-br from-orange-500 to-red-500 text-white text-[11px] font-bold flex items-center justify-center shadow-lg">
          <span className="relative z-10">
            {unread > 99 ? '99+' : unread}
          </span>
          
          {/* Hiệu ứng glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400 to-red-400 opacity-75 animate-pulse"></div>
        </div>
      )}

      {/* Hiệu ứng hover glow */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400/0 to-red-400/0 hover:from-orange-400/20 hover:to-red-400/20 transition-all duration-300"></div>
      
      {/* Subtle pulse effect khi có thông báo */}
      {unread > 0 && (
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500/20 to-red-500/20 animate-pulse"></div>
      )}
    </button>
  );
}
