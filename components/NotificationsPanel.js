// components/NotificationsPanel.js
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import {
  collection, doc, limit, onSnapshot, orderBy, query,
  updateDoc, where, writeBatch, runTransaction, deleteDoc,
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
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base'
  };
  
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-orange-500 to-red-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500', 
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-indigo-500 to-blue-500',
      'bg-gradient-to-br from-pink-500 to-rose-500',
      'bg-gradient-to-br from-teal-500 to-green-500',
      'bg-gradient-to-br from-yellow-500 to-orange-500',
      'bg-gradient-to-br from-slate-500 to-gray-500'
    ];
    const index = (name || '').length % colors.length;
    return colors[index];
  };

  return (
    <div className={`${sizeClasses[size]} ${getAvatarColor(userName)} rounded-full flex items-center justify-center text-white font-bold shadow-lg ring-3 ring-white dark:ring-gray-800`}>
      {getInitials(userName)}
    </div>
  );
}

/* === Component Icon thông báo === */
function NotificationIcon({ type }) {
  const iconConfig = {
    reply: {
      icon: '↩️',
      bgColor: 'bg-gradient-to-br from-orange-500 to-red-500',
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
    <div className={`w-7 h-7 ${config.bgColor} rounded-full flex items-center justify-center text-sm ${config.textColor} shadow-lg ring-2 ring-white dark:ring-gray-800`}>
      {config.icon}
    </div>
  );
}

/* === Component Confirmation Dialog === */
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xl">⚠️</span>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {message}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all shadow-lg"
            >
              Xác nhận
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [deletingItems, setDeletingItems] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', itemId: null });

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

  const deleteNotification = async (id) => {
    if (!user) return;
    setDeletingItems(prev => new Set([...prev, id]));
    
    try {
      const notification = items.find(item => item.id === id);
      await deleteDoc(doc(db, 'notifications', id));
      
      // Decrease counter if it was unread
      if (notification && !notification.isRead) {
        await decCounter(user.uid, 1);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    } finally {
      setTimeout(() => {
        setDeletingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 300);
    }
  };

  const deleteAllRead = async () => {
    if (!user) return;
    const readIds = items.filter(i => i.isRead).map(i => i.id);
    if (readIds.length === 0) return;
    
    const batch = writeBatch(db);
    readIds.forEach((nid) => batch.update(doc(db, 'notifications', nid), { deleted: true }));
    await batch.commit();
  };

  const handleDeleteClick = (id, type = 'single') => {
    setConfirmDialog({
      isOpen: true,
      type,
      itemId: id
    });
  };

  const handleConfirmDelete = async () => {
    const { type, itemId } = confirmDialog;
    
    if (type === 'single' && itemId) {
      await deleteNotification(itemId);
    } else if (type === 'allRead') {
      await deleteAllRead();
    }
    
    setConfirmDialog({ isOpen: false, type: '', itemId: null });
  };

  if (!open) return null;

  const readCount = items.filter(i => i.isRead).length;

  return (
    <>
      <div className="fixed right-3 top-14 z-50 w-[28rem] max-w-[95vw]">
        {/* Backdrop với hiệu ứng blur */}
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm -z-10"
          onClick={onClose}
        />
        
        <div className={`bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-3xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
          isAnimating ? 'scale-105' : 'scale-100'
        }`}>
          
          {/* Header với gradient cam đẹp */}
          <div className="px-6 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xl">🔔</span>
                </div>
                <div>
                  <h4 className="font-bold text-xl">Thông báo</h4>
                  <p className="text-white/80 text-sm">{items.length} thông báo</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={markAllRead}
                  className="text-xs px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/30 font-medium"
                >
                  ✓ Đánh dấu tất cả
                </button>
                {readCount > 0 && (
                  <button
                    onClick={() => handleDeleteClick(null, 'allRead')}
                    className="text-xs px-3 py-2 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 backdrop-blur-sm border border-white/30 font-medium"
                  >
                    🗑️ Xóa đã đọc
                  </button>
                )}
                <button 
                  onClick={onClose} 
                  className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 transition-all duration-200 flex items-center justify-center backdrop-blur-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>

          {/* Danh sách thông báo */}
          <div className="max-h-[70vh] overflow-auto">
            {items.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center">
                  <span className="text-3xl opacity-50">📭</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Chưa có thông báo</h3>
                <p className="text-gray-500 dark:text-gray-400">Bạn sẽ nhận được thông báo khi có hoạt động mới</p>
              </div>
            )}

            <div className="p-4 space-y-4">
              {items.map((n, index) => {
                const t = formatDate(n.createdAt);
                const who = n.fromUserName || 'Ai đó';
                const title = n.postTitle || `Bài viết ${n.postId}`;
                const content = n.commentText || '';
                const href = `/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;
                const isDeleting = deletingItems.has(n.id);

                const kind =
                  n.type === 'reply' ? { label: 'Phản hồi', tone: 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-700 dark:from-orange-900/40 dark:to-red-900/40 dark:text-orange-300' } :
                  n.type === 'like'  ? { label: 'Thích', tone: 'bg-gradient-to-r from-pink-100 to-rose-100 text-rose-700 dark:from-pink-900/40 dark:to-rose-900/40 dark:text-rose-300' } :
                                       { label: 'Bình luận', tone: 'bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-700 dark:from-blue-900/40 dark:to-cyan-900/40 dark:text-blue-300' };

                return (
                  <div
                    key={n.id}
                    className={`group relative border border-gray-200 dark:border-gray-700 rounded-2xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${
                      isDeleting ? 'opacity-50 scale-95' : ''
                    } ${
                      n.isRead 
                        ? 'bg-white dark:bg-gray-900' 
                        : 'bg-gradient-to-br from-orange-50/80 to-red-50/80 dark:from-orange-900/20 dark:to-red-900/20 ring-2 ring-orange-200/50 dark:ring-orange-700/50'
                    } ${index === 0 && isAnimating ? 'animate-pulse' : ''}`}
                    style={{
                      animationDelay: `${index * 50}ms`
                    }}
                  >
                    {/* Indicator chưa đọc */}
                    {!n.isRead && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-gradient-to-br from-orange-500 to-red-500 rounded-full shadow-lg">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-red-400 rounded-full animate-ping opacity-75"></div>
                      </div>
                    )}

                    {/* Nút xóa */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteClick(n.id);
                      }}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100 z-10"
                      title="Xóa thông báo"
                    >
                      <span className="text-gray-500 hover:text-red-500 text-sm">🗑️</span>
                    </button>

                    <Link
                      href={href}
                      onClick={() => !n.isRead && markRead(n.id, n.isRead)}
                      className="block no-underline"
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar người gửi */}
                        <div className="flex-shrink-0 mt-1">
                          <UserAvatar userName={who} size="md" />
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Header thông báo */}
                          <div className="flex items-center gap-3">
                            <NotificationIcon type={n.type} />
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-gray-900 dark:text-gray-100 text-base">
                                {who}
                              </span>
                              <span className={`text-xs px-3 py-1 rounded-full font-semibold ${kind.tone}`}>
                                {kind.label}
                              </span>
                            </div>
                          </div>

                          {/* Nội dung thông báo */}
                          <div className="space-y-2">
                            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                              trong bài viết{' '}
                              <span className="font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                                "{title}"
                              </span>
                            </p>

                            {/* Nội dung comment nếu có */}
                            {content && (
                              <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 italic leading-relaxed">
                                  "{content}"
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between pt-2">
                            {t && (
                              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium" title={t.abs}>
                                {t.rel}
                              </span>
                            )}
                            
                            {/* Nút xem chi tiết */}
                            <span className="text-sm text-orange-600 dark:text-orange-400 font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              Xem chi tiết →
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Nút đánh dấu đã đọc */}
                    {!n.isRead && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            markRead(n.id, n.isRead);
                          }}
                          className="text-sm px-4 py-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all duration-200 shadow-lg hover:shadow-xl font-medium"
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: '', itemId: null })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.type === 'allRead' ? 'Xóa tất cả thông báo đã đọc?' : 'Xóa thông báo này?'}
        message={confirmDialog.type === 'allRead' 
          ? `Bạn có chắc chắn muốn xóa ${readCount} thông báo đã đọc? Hành động này không thể hoàn tác.`
          : 'Bạn có chắc chắn muốn xóa thông báo này? Hành động này không thể hoàn tác.'
        }
      />
    </>
  );
}

