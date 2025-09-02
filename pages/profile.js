// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout'; // header + footer
import { auth, db, storage } from '../lib/firebase-client';

import {
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  unlink,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
  getCountFromServer,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';

import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCheckCircle, faTimesCircle, faCloudArrowUp,
  faLink, faUnlink, faCertificate, faMedal
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

/* ========= Helpers ========= */
function toDateLike(x) {
  if (!x) return null;
  if (x?.seconds) return new Date(x.seconds * 1000);
  if (x instanceof Date) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}
function formatRelAbs(input) {
  const d = toDateLike(input);
  if (!d) return null;
  const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const units = [
    ['year', 31536000], ['month', 2592000], ['week', 604800],
    ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1],
  ];
  for (const [unit, sec] of units) {
    if (Math.abs(diffSec) >= sec || unit === 'second') {
      const val = Math.round(diffSec / sec * -1);
      return { rel: rtf.format(val, unit), abs: d.toLocaleString('vi-VN'), date: d };
    }
  }
  return { rel: '', abs: d.toLocaleString('vi-VN'), date: d };
}

/* ========= Page ========= */
export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // providers
  const providers = useMemo(() => (user?.providerData?.map((p) => p.providerId) || []), [user]);
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');

  // thống kê & activity
  const [stats, setStats] = useState({ comments: 0, likes: 0, badges: [] });
  const [recentComments, setRecentComments] = useState([]);
  const [joinedAt, setJoinedAt] = useState(null);
  const [lastActive, setLastActive] = useState(null);

  const showToast = (type, text, ms = 3200) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t || 0);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  /* ===== Load auth user + đảm bảo users/{uid} tồn tại ===== */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;

      setDisplayName(u.displayName || '');

      // tạo/lấy doc users/{uid}
      const uref = doc(db, 'users', u.uid);
      const snap = await getDoc(uref);
      if (!snap.exists()) {
        await setDoc(uref, {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          badges: [],
        }, { merge: true });
      } else if (!snap.data().createdAt) {
        await setDoc(uref, { createdAt: serverTimestamp() }, { merge: true });
      }

      // Ngày tham gia (ưu tiên users.createdAt, fallback metadata.creationTime)
      const fresh = await getDoc(uref);
      const created = fresh.data()?.createdAt || u.metadata?.creationTime || null;
      setJoinedAt(created ? formatRelAbs(created) : null);

      // Trạng thái hoạt động (ưu tiên lastSignInTime)
      const lastSign = u.metadata?.lastSignInTime ? formatRelAbs(u.metadata.lastSignInTime) : null;
      setLastActive(lastSign);
    });
    return () => unsub();
  }, []);

  /* ===== Thống kê & Hoạt động gần đây (tương thích dữ liệu cũ/mới) =====
     - Ưu tiên schema mới của Comments.js: authorId, likeCount, createdAt
     - Đồng thời đọc dữ liệu cũ: userId, likesCount, timestamp
     - Có index: dùng where+orderBy; không index: fallback chỉ where rồi sort client
     (Comments.js: tạo comment với authorId/likeCount/createdAt)  */
  useEffect(() => {
    if (!user) return;

    (async () => {
      const myUid = user.uid;
      const base = collection(db, 'comments');

      // 1) Lấy tất cả bình luận của tôi theo cả 2 schema (mới+cũ)
      const getByField = async (field) => {
        try {
          // thử orderBy createdAt desc (cần index nếu kết hợp where+orderBy)
          const q1 = query(base, where(field, '==', myUid), orderBy('createdAt', 'desc'), limit(50));
          const s1 = await getDocs(q1);
          return s1.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch {
          // fallback: chỉ where (không cần index), sau sort client
          const q2 = query(base, where(field, '==', myUid), limit(200));
          const s2 = await getDocs(q2);
          return s2.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      };

      const [arrA, arrB] = await Promise.all([getByField('authorId'), getByField('userId')]);
      const allMap = new Map();
      [...arrA, ...arrB].forEach(c => allMap.set(c.id, c));
      let allMine = Array.from(allMap.values());

      // 2) Tổng like nhận (chấp nhận likeCount hoặc likesCount)
      let totalLikes = 0;
      allMine.forEach(c => {
        const v = Number.isFinite(Number(c.likeCount)) ? Number(c.likeCount)
                : Number.isFinite(Number(c.likesCount)) ? Number(c.likesCount)
                : 0;
        totalLikes += v;
      });

      // 3) Sắp xếp hoạt động theo thời gian (chấp nhận createdAt/timestamp)
      allMine.sort((a, b) => {
        const da = toDateLike(a.createdAt || a.timestamp) || new Date(0);
        const db = toDateLike(b.createdAt || b.timestamp) || new Date(0);
        return db.getTime() - da.getTime();
      });
      const recent = allMine.slice(0, 10);

      // 4) Đếm bình luận
      let commentsCount = allMine.length;
      // nếu thích con số "chuẩn Firestore" và có index -> dùng getCountFromServer(authorId)
      try {
        const cnt = await getCountFromServer(query(base, where('authorId', '==', myUid)));
        commentsCount = Math.max(commentsCount, cnt.data().count || 0);
      } catch {} // không sao nếu thiếu index

      // 5) Huy hiệu từ users/{uid}
      let badges = [];
      try {
        const uDoc = await getDoc(doc(db, 'users', myUid));
        badges = (uDoc.exists() && Array.isArray(uDoc.data().badges)) ? uDoc.data().badges : [];
      } catch {}

      setStats({ comments: commentsCount, likes: totalLikes, badges });
      setRecentComments(recent);

      // 6) Nếu chưa có lastActive (không có lastSignInTime) => lấy theo comment mới nhất
      if ((!lastActive || !lastActive.date) && recent.length > 0) {
        const latest = toDateLike(recent[0].createdAt || recent[0].timestamp);
        if (latest) setLastActive(formatRelAbs(latest));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  /* ===== Handlers ===== */
  const onUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploading(true);
      const path = `avatars/${user.uid}/${Date.now()}_${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      setUser({ ...user, photoURL: url });
      showToast('success', 'Đã cập nhật ảnh đại diện!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSave = async () => {
    if (!user) return;
    if (!displayName.trim()) return showToast('error', 'Tên hiển thị không được để trống.');
    try {
      setSaving(true);
      await updateProfile(user, { displayName: displayName.trim() });
      await setDoc(doc(db, 'users', user.uid), { displayName: displayName.trim(), updatedAt: serverTimestamp() }, { merge: true });
      setUser({ ...user, displayName: displayName.trim() });
      showToast('success', 'Đã lưu hồ sơ!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const onResendVerify = async () => {
    try {
      await sendEmailVerification(user);
      showToast('success', 'Đã gửi email xác minh!');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const onLink = async (type) => {
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await linkWithPopup(user, provider);
      showToast('success', `Đã liên kết ${type === 'google' ? 'Google' : 'GitHub'}!`);
    } catch (err) {
      showToast('error', err.message);
    }
  };
  const onUnlink = async (providerId) => {
    try {
      await unlink(user, providerId);
      showToast('success', 'Đã huỷ liên kết!');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const avatar = user?.photoURL || null;

  if (!user) {
    return (
      <Layout>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
        <div className="w-full max-w-screen-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-4">Hồ sơ</h1>
          <p className="text-gray-600 dark:text-gray-300">Bạn cần đăng nhập để xem trang này.</p>
        </div>
      </Layout>
    );
  }

  const joinedStr = joinedAt ? joinedAt.abs : '--';
  const lastActiveStr = lastActive
    ? (Math.abs((Date.now() - lastActive.date.getTime())/60000) < 3 ? 'Đang hoạt động' : `Hoạt động ${lastActive.rel}`)
    : '--';

  return (
    <Layout>
      <Head><title>Hồ sơ – StoreiOS</title></Head>

      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
          ${toast.type === 'error'
            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}>
          {toast.text}
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của bạn</h1>

        {/* Card hồ sơ */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow">
          <div className="p-6 grid grid-cols-1 md:grid-cols-[180px,1fr] gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    className="w-36 h-36 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <FontAwesomeIcon icon={faUserCircle} className="w-20 h-20 opacity-70" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full px-3 py-1.5 text-xs bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow"
                >
                  <FontAwesomeIcon icon={faCloudArrowUp} className="mr-1" />
                  Tải ảnh
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onUploadAvatar}
                />
              </div>
              {uploading && <div className="mt-2 text-xs text-gray-500">Đang tải ảnh…</div>}

              {/* Ngày tham gia & Trạng thái */}
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <div><span className="text-gray-500">Ngày tham gia:</span> <span className="font-medium">{joinedStr}</span></div>
                <div><span className="text-gray-500">Trạng thái:</span> <span className="font-medium">{lastActiveStr}</span></div>
              </div>
            </div>

            {/* Form info */}
            <div>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <div className="mt-1 text-sm break-all">{user.email}</div>
                </div>

                <div>
                  <label htmlFor="displayName" className="text-sm text-gray-500">Tên hiển thị</label>
                  <input
                    id="displayName"
                    className="mt-1 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Tên của bạn"
                  />
                </div>

                {/* Email verify status */}
                <div className="flex flex-wrap items-center gap-3">
                  {user.emailVerified ? (
                    <span className="inline-flex items-center gap-2 text-emerald-600">
                      <FontAwesomeIcon icon={faCheckCircle} />
                      Email đã xác minh
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-2 text-amber-600">
                        <FontAwesomeIcon icon={faTimesCircle} />
                        Email chưa xác minh
                      </span>
                      <button
                        onClick={onResendVerify}
                        className="px-3 py-1.5 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700"
                      >
                        Gửi lại email xác minh
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
                >
                  {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
                </button>
              </div>
            </div>
          </div>

          {/* Providers */}
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold mb-3">Đăng nhập liên kết</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGoogle} />
                  <span>Google</span>
                </div>
                {hasGoogle ? (
                  <button
                    onClick={() => onUnlink('google.com')}
                    className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                    title="Huỷ liên kết Google"
                  >
                    <FontAwesomeIcon icon={faUnlink} />
                    Huỷ
                  </button>
                ) : (
                  <button
                    onClick={() => onLink('google')}
                    className="px-3 py-1.5 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 flex items-center gap-2"
                    title="Liên kết Google"
                  >
                    <FontAwesomeIcon icon={faLink} />
                    Liên kết
                  </button>
                )}
              </div>

              {/* GitHub */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGithub} />
                  <span>GitHub</span>
                </div>
                {hasGithub ? (
                  <button
                    onClick={() => onUnlink('github.com')}
                    className="px-3 py-1.5 rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
                    title="Huỷ liên kết GitHub"
                  >
                    <FontAwesomeIcon icon={faUnlink} />
                    Huỷ
                  </button>
                ) : (
                  <button
                    onClick={() => onLink('github')}
                    className="px-3 py-1.5 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 flex items-center gap-2"
                    title="Liên kết GitHub"
                  >
                    <FontAwesomeIcon icon={faLink} />
                    Liên kết
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Thống kê & Hoạt động gần đây */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Thống kê cá nhân */}
          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Thống kê cá nhân</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{stats.comments}</div>
                <div className="text-xs text-gray-500 mt-1">Bình luận</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{stats.likes}</div>
                <div className="text-xs text-gray-500 mt-1">Lượt like nhận</div>
              </div>
              <div>
                <div className="flex items-center justify-center gap-1 text-2xl">
                  <FontAwesomeIcon icon={faCertificate} />
                </div>
                <div className="text-xs text-gray-500 mt-1">Huy hiệu</div>
              </div>
            </div>

            {/* Huy hiệu */}
            {Array.isArray(stats.badges) && stats.badges.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {stats.badges.map((b, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <FontAwesomeIcon icon={faMedal} />
                    {b}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-gray-500">Chưa có huy hiệu.</p>
            )}
          </div>

          {/* Hoạt động gần đây (từ comments của bạn) */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
            {recentComments.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có hoạt động.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2 pr-4">Thời gian</th>
                      <th className="py-2 pr-4">Nội dung</th>
                      <th className="py-2 pr-4">Bài viết</th>
                      <th className="py-2">Lượt like</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentComments.map((c) => {
                      const t = formatRelAbs(c.createdAt || c.timestamp);
                      const likeNum = Number.isFinite(Number(c.likeCount)) ? Number(c.likeCount)
                                    : Number.isFinite(Number(c.likesCount)) ? Number(c.likesCount)
                                    : 0;
                      return (
                        <tr key={c.id} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-2 pr-4" title={t?.abs || ''}>{t?.rel || '-'}</td>
                          <td className="py-2 pr-4 max-w-[520px] truncate">{String(c.content || c.text || '').trim()}</td>
                          <td className="py-2 pr-4">{c.postId || '-'}</td>
                          <td className="py-2">{Math.max(0, likeNum)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}