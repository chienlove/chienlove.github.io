// components/NotificationsPanel.js
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  collection, doc, limit, onSnapshot, orderBy, query,
  updateDoc, where, writeBatch, runTransaction,
} from 'firebase/firestore';
import Link from 'next/link';

/* === helper định dạng thời gian === */
function formatDate(ts) {
  try {
    let d = null;
    if (!ts) return null;
    if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === 'number') d = new Date(ts);
    else if (typeof ts === 'string') d = new Date(ts);
    else if (ts instanceof Date) d = ts;
    if (!d) return null;
    const rel = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const diff = (Date.now() - d.getTime()) / 1000;
    const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
    for (const [unit, sec] of units) {
      if (Math.abs(diff) >= sec || unit === 'second') {
        const val = Math.round(diff / sec * -1);
        return { rel: rel.format(val, unit), abs: d.toLocaleString('vi-VN') };
      }
    }
    return { rel: '', abs: d.toLocaleString('vi-VN') };
  } catch { return null; }
}

/* === Component Avatar === */
function UserAvatar({ userName, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-purple-500 to-pink-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500', 
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-orange-500 to-red-500',
      'bg-gradient-to-br from-indigo-500 to-purple-500',
      'bg-gradient-to-br from-pink-500 to-rose-500',
      'bg-gradient-to-br from-teal-500 to-green-500',
      'bg-gradient-to-br from-yellow-500 to-orange-500'
    ];
    const index = (name || '').length % colors.length;
    return colors[index];
  };

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(userName)} rounded-full flex items-center justify-center text-white font-semibold shadow-lg ring-2 ring-white dark:ring-gray-800`}>
      {getInitials(userName)}
    </div>
  );
}

/* === Component Icon thông báo === */
function NotificationIcon({ type }) {
  const iconConfig = {
    reply: {
      icon: '↩️',
      bgColor: 'bg-gradient-to-br from-violet-500 to-purple-500',
      textColor: 'text-white'
    },
    like: {
      icon: '❤️',
      bgColor: 'bg-gradient-to-br from-pink-500 to-rose-500', 
      textColor: 'text-white'
    },
    comment: {
      icon: '💬',
      bgColor: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      textColor: 'text-white'
    },
    mention: {
      icon: '@',
      bgColor: 'bg-gradient-to-br from-green-500 to-emerald-500',
      textColor: 'text-white'
    },
    follow: {
      icon: '👤',
      bgColor: 'bg-gradient-to-br from-indigo-500 to-blue-500',
      textColor: 'text-white'
    }
  };

  const config = iconConfig[type] || iconConfig.comment;

  return (
    <div className={`w-6 h-6 ${config.bgColor} rounded-full flex items-center justify-center text-xs ${config.textColor} shadow-md`}>
      {config.icon}
    </div>
  );
}

export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(setUser);
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user || !open) return;
    const qn = query(
      collection(db, 'notifications'),
      where('toUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsub = onSnapshot(qn, (snap) => {
      setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      // Trigger animation when new notifications arrive
      if (snap.docs.length > 0) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    });
    return () => unsub();
  }, [user, open]);

  const decCounter = async (uid, amount = 1) => {
    const counterRef = doc(db, 'user_counters', uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
      tx.set(counterRef, { unreadCount: Math.max(0, cur - amount) }, { merge: true });
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
    <div className="fixed right-3 top-14 z-50 w-[26rem] max-w-[95vw]">
      {/* Backdrop với hiệu ứng blur */}
      <div 
        className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
        onClick={onClose}
      />
      
      <div className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        isAnimating ? 'scale-105' : 'scale-100'
      }`}>
        
        {/* Header với gradient đẹp */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">🔔</span>
              </div>
              <h4 className="font-bold text-lg">Thông báo</h4>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={markAllRead}
                className="text-xs px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/30"
              >
                ✓ Đánh dấu tất cả
              </button>
              <button 
                onClick={onClose} 
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Danh sách thông báo */}
        <div className="max-h-[70vh] overflow-auto">
          {items.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                <span className="text-2xl opacity-50">📭</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400">Chưa có thông báo nào</p>
            </div>
          )}

          <div className="p-3 space-y-3">
            {items.map((n, index) => {
              const t = formatDate(n.createdAt);
              const who = n.fromUserName || 'Ai đó';
              const title = n.postTitle || `Bài viết ${n.postId}`;
              const content = n.commentText || '';
              const href = `/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;

              const kind =
                n.type === 'reply' ? { label: 'Phản hồi', tone: 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 dark:from-violet-900/40 dark:to-purple-900/40 dark:text-violet-300' } :
                n.type === 'like'  ? { label: 'Thích', tone: 'bg-gradient-to-r from-pink-100 to-rose-100 text-rose-700 dark:from-pink-900/40 dark:to-rose-900/40 dark:text-rose-300' } :
                                     { label: 'Bình luận', tone: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-300' };

              return (
                <div
                  key={n.id}
                  className={`group relative border border-gray-100 dark:border-gray-800 rounded-2xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${
                    n.isRead 
                      ? 'bg-white dark:bg-gray-900' 
                      : 'bg-gradient-to-br from-blue-50/80 to-purple-50/80 dark:from-blue-900/20 dark:to-purple-900/20 ring-2 ring-blue-200/50 dark:ring-blue-700/50'
                  } ${index === 0 && isAnimating ? 'animate-pulse' : ''}`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  {/* Indicator chưa đọc */}
                  {!n.isRead && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full animate-pulse shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full animate-ping opacity-75"></div>
                    </div>
                  )}

                  <Link
                    href={href}
                    onClick={() => !n.isRead && markRead(n.id, n.isRead)}
                    className="block no-underline"
                  >
                    <div className="flex items-start gap-4">
                      {/* Avatar người gửi */}
                      <div className="flex-shrink-0">
                        <UserAvatar userName={who} size="md" />
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Header thông báo */}
                        <div className="flex items-center gap-2 mb-2">
                          <NotificationIcon type={n.type} />
                          <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {who}
                          </span>
                          <span className={`text-[11px] px-2 py-1 rounded-full font-medium ${kind.tone}`}>
                            {kind.label}
                          </span>
                        </div>

                        {/* Nội dung thông báo */}
                        <div className="mb-2">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            trong bài viết{' '}
                            <span className="font-medium text-blue-600 dark:text-blue-400 hover:underline">
                              "{title}"
                            </span>
                          </span>
                        </div>

                        {/* Nội dung comment nếu có */}
                        {content && (
                          <div className="mb-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 italic">
                              "{content}"
                            </p>
                          </div>
                        )}

                        {/* Thời gian */}
                        <div className="flex items-center justify-between">
                          {t && (
                            <span className="text-xs text-gray-500 dark:text-gray-400" title={t.abs}>
                              {t.rel}
                            </span>
                          )}
                          
                          {/* Nút xem chi tiết */}
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            Xem chi tiết →
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Nút đánh dấu đã đọc */}
                  {!n.isRead && (
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          markRead(n.id, n.isRead);
                        }}
                        className="text-xs px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        ✓ Đánh dấu đã đọc
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

