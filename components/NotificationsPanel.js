// components/NotificationsPanel.js (minimal, clean)
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  collection, doc, limit, onSnapshot, orderBy, query,
  updateDoc, where, writeBatch, runTransaction, deleteDoc,
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faCheckDouble, faTrash, faTimes, faEllipsisVertical,
  faExternalLinkAlt, faEnvelopeOpen
} from '@fortawesome/free-solid-svg-icons';

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

/* === Dialog xác nhận === */
function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 shadow-2xl">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
            Hủy
          </button>
          <button onClick={onConfirm} className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

/* === Avatar chữ cái (tối giản) === */
function UserAvatar({ userName }) {
  const initials = useMemo(() => {
    if (!userName) return '?';
    return userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2);
  }, [userName]);
  return (
    <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[12px] font-bold text-gray-700 dark:text-gray-200">
      {initials}
    </div>
  );
}

/* === Panel thông báo === */
export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: '', itemId: null });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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
    });
    return () => unsub();
  }, [user, open]);

  // đóng menu khi click ra ngoài
  useEffect(() => {
    const handler = (e) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const readCount = items.filter(i => i.isRead).length;
  const unreadCount = items.length - readCount;

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
    const n = items.find(it => it.id === id);
    await deleteDoc(doc(db, 'notifications', id));
    if (n && !n.isRead) await decCounter(user.uid, 1);
  };

  const deleteAllRead = async () => {
    if (!user) return;
    const ids = items.filter(i => i.isRead).map(i => i.id);
    if (ids.length === 0) return;
    const batch = writeBatch(db);
    ids.forEach((nid) => batch.delete(doc(db, 'notifications', nid)));
    await batch.commit();
  };

  const handleDeleteClick = (id, type = 'single') => {
    setConfirmDialog({
      isOpen: true,
      type,
      itemId: id
    });
    setMenuOpen(false);
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

  return (
    <>
      <div className="fixed right-3 top-14 z-50 w-[28rem] max-w-[95vw]">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/30 -z-10" onClick={onClose} />

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden">
          {/* Header tối giản */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FontAwesomeIcon icon={faBell} className="text-gray-700 dark:text-gray-200" />
              <div className="leading-tight">
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Thông báo</h4>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {items.length} tổng · {unreadCount} chưa đọc
                </div>
              </div>
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Mở menu"
                title="Tùy chọn"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>

              {/* Menu 3 chấm */}
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
                  <button
                    onClick={() => { setMenuOpen(false); markAllRead(); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCheckDouble} className="text-gray-600 dark:text-gray-300" />
                    Đánh dấu tất cả là đã đọc
                  </button>
                  <button
                    onClick={() => handleDeleteClick(null, 'allRead')}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-rose-600" />
                    Xoá tất cả đã đọc
                  </button>
                  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={onClose}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faTimes} />
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Danh sách */}
          <div className="max-h-[70vh] overflow-auto">
            {items.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400">
                Chưa có thông báo
              </div>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {items.map((n) => {
                  const t = formatDate(n.createdAt);
                  const who = n.fromUserName || 'Ai đó';
                  const title = n.postTitle || `Bài viết ${n.postId}`;
                  const content = n.commentText || '';
                  const href = `/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;

                  return (
                    <li
                      key={n.id}
                      className={`px-4 py-3 ${n.isRead ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950'}`}
                    >
                      <div className="flex gap-3">
                        {/* avatar */}
                        <UserAvatar userName={who} />

                        <div className="flex-1 min-w-0">
                          {/* dòng tiêu đề */}
                          <div className="flex items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-900 dark:text-gray-100">
                                  {who}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400" title={t?.abs}>
                                  {t?.rel}
                                </span>
                                {!n.isRead && (
                                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    <FontAwesomeIcon icon={faEnvelopeOpen} />
                                    Mới
                                  </span>
                                )}
                              </div>

                              <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                {n.type === 'reply' ? 'đã phản hồi' : n.type === 'like' ? 'đã thích bình luận của bạn' : 'đã bình luận'}
                                {' '}trong{' '}
                                <span className="font-medium">"{title}"</span>
                              </div>

                              {content && (
                                <div className="mt-2 text-[13px] text-gray-600 dark:text-gray-400 line-clamp-3">
                                  "{content}"
                                </div>
                              )}
                            </div>

                            {/* actions: xoá luôn hiển thị */}
                            <div className="flex flex-col items-end gap-2">
                              <button
                                onClick={() => handleDeleteClick(n.id, 'single')}
                                title="Xoá thông báo"
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                              >
                                <FontAwesomeIcon icon={faTrash} className="text-rose-600" />
                              </button>
                            </div>
                          </div>

                          {/* hàng liên kết + đánh dấu đã đọc */}
                          <div className="mt-2 flex items-center justify-between">
                            <Link
                              href={href}
                              onClick={() => !n.isRead && markRead(n.id, n.isRead)}
                              className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                              title="Xem chi tiết"
                            >
                              <FontAwesomeIcon icon={faExternalLinkAlt} />
                              Xem chi tiết
                            </Link>

                            {!n.isRead && (
                              <button
                                onClick={() => markRead(n.id, n.isRead)}
                                className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
                              >
                                Đánh dấu đã đọc
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Confirm */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: '', itemId: null })}
        onConfirm={handleConfirmDelete}
        title={confirmDialog.type === 'allRead' ? 'Xoá tất cả thông báo đã đọc?' : 'Xoá thông báo này?'}
        message={confirmDialog.type === 'allRead'
          ? `Bạn có chắc muốn xoá ${readCount} thông báo đã đọc? Hành động này không thể hoàn tác.`
          : 'Bạn có chắc muốn xoá thông báo này? Hành động này không thể hoàn tác.'
        }
      />
    </>
  );
}