// components/NotificationsPanel.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  collection, deleteDoc, doc, limit, onSnapshot, orderBy, query,
  runTransaction, updateDoc, where, writeBatch
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBell, faEllipsisVertical, faTrash, faCheckDouble, faTimes,
  faExternalLinkAlt, faHeart, faComment, faReply, faEnvelopeOpen
} from '@fortawesome/free-solid-svg-icons';

/* ========== Helpers ========== */
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

function InitialsAvatar({ name, size = 36 }) {
  const initials = (name || '?')
    .split(' ')
    .map(s => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className="rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initials}
    </div>
  );
}

function UserAvatar({ photo, name, size = 44 }) {
  if (photo) {
    return (
      <img
        src={photo}
        referrerPolicy="no-referrer"
        alt={name || 'avatar'}
        className="rounded-full object-cover border border-gray-200 dark:border-gray-700"
        style={{ width: size, height: size }}
      />
    );
  }
  return <InitialsAvatar name={name} size={size} />;
}

/* ========== Nhóm theo type ========== */
const TYPE_META = {
  like:   { label: 'Lượt thích', icon: faHeart,   tone: 'text-rose-600 dark:text-rose-400' },
  comment:{ label: 'Bình luận',  icon: faComment, tone: 'text-blue-600 dark:text-blue-400' },
  reply:  { label: 'Phản hồi',   icon: faReply,   tone: 'text-amber-600 dark:text-amber-400' },
};
const ORDER = ['like', 'comment', 'reply']; // giống "code ban đầu" (like → bình luận → phản hồi)

/* ========== Confirm Dialog ========== */
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

/* ========== Main ========== */
export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirm, setConfirm] = useState({ open: false, type: '', id: null });
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
      limit(50)
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

  /* ---- counters ---- */
  const decCounter = async (uid, amount = 1) => {
    const counterRef = doc(db, 'user_counters', uid);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
      tx.set(counterRef, { unreadCount: Math.max(0, cur - amount) }, { merge: true });
    });
  };

  /* ---- actions ---- */
  const markRead = async (id, wasRead) => {
    if (!user) return;
    await updateDoc(doc(db, 'notifications', id), { isRead: true });
    if (!wasRead) await decCounter(user.uid, 1);
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

  const deleteOne = async (id) => {
    if (!user) return;
    const n = items.find(x => x.id === id);
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

  /* ---- group by type ---- */
  const groups = useMemo(() => {
    const m = { like: [], comment: [], reply: [] };
    for (const n of items) {
      const t = (n.type === 'like' || n.type === 'reply' || n.type === 'comment') ? n.type : 'comment';
      m[t].push(n);
    }
    return m;
  }, [items]);

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

            {/* Menu 3 chấm */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="w-9 h-9 inline-flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Mở menu"
                title="Tùy chọn"
              >
                <FontAwesomeIcon icon={faEllipsisVertical} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl">
                  <button
                    onClick={() => { setMenuOpen(false); markAllRead(); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-800 inline-flex items-center gap-2"
                  >
                    <FontAwesomeIcon icon={faCheckDouble} />
                    Đánh dấu tất cả là đã đọc
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); setConfirm({ open: true, type: 'allRead', id: null }); }}
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

          {/* Danh sách theo nhóm */}
          <div className="max-h-[70vh] overflow-auto">
            {items.length === 0 ? (
              <div className="py-16 text-center text-gray-500 dark:text-gray-400">Chưa có thông báo</div>
            ) : (
              ORDER.map((typeKey) => {
                const section = groups[typeKey];
                if (!section || section.length === 0) return null;
                const meta = TYPE_META[typeKey];

                return (
                  <div key={typeKey} className="py-2">
                    {/* Header nhóm */}
                    <div className="px-4 py-2 flex items-center gap-2">
                      <FontAwesomeIcon icon={meta.icon} className={`${meta.tone}`} />
                      <span className={`text-sm font-semibold ${meta.tone}`}>{meta.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">· {section.length}</span>
                    </div>

                    <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                      {section.map((n) => {
                        const t = formatDate(n.createdAt);
                        const who = n.fromUserName || 'Ai đó';
                        const title = n.postTitle || `Bài viết ${n.postId}`;
                        const content = n.commentText || '';
                        const href = `/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;

                        return (
                          <li key={n.id} className={`px-4 py-3 ${n.isRead ? 'bg-white dark:bg-gray-900' : 'bg-gray-50 dark:bg-gray-950'}`}>
                            <div className="flex gap-3">
                              {/* Avatar thực */}
                              <UserAvatar photo={n.fromUserPhoto} name={who} size={44} />

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-semibold text-gray-900 dark:text-gray-100">{who}</span>
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

                                    {/* dòng nội dung: tên bài viết nổi bật hơn phần trích bình luận */}
                                    <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                      {typeKey === 'reply' ? 'đã phản hồi' : typeKey === 'like' ? 'đã thích bình luận của bạn' : 'đã bình luận'}
                                      {' '}trong{' '}
                                      <span className="font-medium text-blue-600 dark:text-blue-400">"{title}"</span>
                                    </div>

                                    {content && (
                                      <div className="mt-2 text-[13px] text-gray-600 dark:text-gray-400 line-clamp-3">
                                        "{content}"
                                      </div>
                                    )}
                                  </div>

                                  {/* Xoá (luôn hiển thị) */}
                                  <button
                                    onClick={() => setConfirm({ open: true, type: 'single', id: n.id })}
                                    title="Xoá thông báo"
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                                  >
                                    <FontAwesomeIcon icon={faTrash} className="text-rose-600" />
                                  </button>
                                </div>

                                {/* Hàng link + đánh dấu đã đọc */}
                                <div className="mt-2 flex items-center justify-between">
                                  <Link
                                    href={href}
                                    onClick={async () => { await markRead(n.id, n.isRead); onClose?.(); }}
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Confirm */}
      <ConfirmDialog
        isOpen={confirm.open}
        onClose={() => setConfirm({ open: false, type: '', id: null })}
        onConfirm={async () => {
          if (confirm.type === 'single' && confirm.id) await deleteOne(confirm.id);
          if (confirm.type === 'allRead') await deleteAllRead();
          setConfirm({ open: false, type: '', id: null });
        }}
        title={confirm.type === 'allRead' ? 'Xoá tất cả thông báo đã đọc?' : 'Xoá thông báo này?'}
        message={confirm.type === 'allRead'
          ? `Bạn có chắc muốn xoá ${readCount} thông báo đã đọc? Hành động này không thể hoàn tác.`
          : 'Bạn có chắc muốn xoá thông báo này? Hành động này không thể hoàn tác.'}
      />
    </>
  );
}