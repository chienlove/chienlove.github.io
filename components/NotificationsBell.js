import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

export default function NotificationsBell({ onClick }) {
  const [user, setUser] = useState(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(setUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const ref = doc(db, 'user_counters', user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUnread(snap.exists() ? snap.data()?.unreadCount || 0 : 0);
    });
    return () => unsub();
  }, [user]);

  return (
    <button onClick={onClick} className="relative" aria-label="Notifications">
      {/* Bạn có thể thay bằng FontAwesome/heroicons */}
      <span className="material-icons">notifications</span>
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1">
          {unread}
        </span>
      )}
    </button>
  );
}