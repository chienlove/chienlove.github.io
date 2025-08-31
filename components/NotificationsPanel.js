// components/NotificationsPanel.js
import { useEffect, useState, useMemo } from 'react';
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

export default function NotificationsPanel({ open, onClose }) {
  const [user, setUser] = useState(null);
  const [items, setItems] = useState([]);

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

  const decCounter = async (uid, amount = 1) => {
    // giữ tương thích nếu bạn còn dùng user_counters
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
    // ✅ fixed + padding để không lệch/khuyết trên mobile
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
            <li className="text-sm text-gray-600 dark:text-gray-400 py-4 text-center">Chưa có thông báo</li>
          )}

          {items.map((n) => {
            const t = formatDate(n.createdAt);
            const who = n.fromUserName || 'Ai đó';
            const title = n.postTitle || `Bài viết ${n.postId}`;
            const content = n.commentText ? `"${n.commentText}"` : '';
            const href = `/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;
            return (
              <li
                key={n.id}
                className={`border border-gray-100 dark:border-gray-800 rounded-xl p-3 bg-white/70 dark:bg-gray-900/60 hover:bg-gray-50 dark:hover:bg-gray-800/70 transition`}
              >
                <Link
                  href={href}
                  onClick={() => !n.isRead && markRead(n.id, n.isRead)}
                  className="flex items-start gap-3 no-underline"
                >
                  <div className="flex-1">
                    <div className="text-[13px] text-gray-900 dark:text-gray-100 font-medium leading-5">
                      {n.type === 'reply' ? (
                        <span><b>{who}</b> đã trả lời bình luận trong <i>{title}</i> {content}</span>
                      ) : (
                        <span><b>{who}</b> đã bình luận trong <i>{title}</i> {content}</span>
                      )}
                    </div>
                    {t && (
                      <div className="mt-1 text-[12px] text-gray-500" title={t.abs}>
                        {t.rel}
                      </div>
                    )}
                  </div>
                  {!n.isRead && (
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                  )}
                </Link>
                {!n.isRead && (
                  <div className="mt-2">
                    <button
                      onClick={() => markRead(n.id, n.isRead)}
                      className="text-[12px] px-2 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded"
                    >
                      Đã đọc
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
