// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { auth, db } from '../lib/firebase-client';
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
  // ==== thêm cho phần bình luận gần đây ====
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faCheckCircle,
  faTimesCircle,
  faCloudArrowUp,
  faHome,
  faChevronRight,
  faCircleInfo,
  faComment,
  faCalendarDays,
  faHeart
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

/** Nén ảnh thành WebP 512x512 ~82% chất lượng */
async function compressImage(file, { maxW = 512, maxH = 512, quality = 0.82, mime = 'image/webp' } = {}) {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(maxW / bitmap.width, maxH / bitmap.height, 1);
    const w = Math.max(1, Math.round(bitmap.width * ratio));
    const h = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { alpha: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise(res => canvas.toBlob(res, mime, quality));
    return blob || file;
  } catch {
    return file; // fallback nếu trình duyệt không hỗ trợ
  }
}

/** hiển thị còn bao nhiêu ngày được đổi tên */
function daysUntil(date, addDays = 30) {
  if (!date) return 0;
  const start = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  const unlock = new Date(start.getTime() + addDays * 24 * 60 * 60 * 1000);
  const diff = Math.ceil((unlock.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

/* ---- Helpers thời gian ---- */
function toDate(ts) {
  try {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'number' || typeof ts === 'string') return new Date(ts);
    if (ts instanceof Date) return ts;
  } catch {}
  return null;
}
const fmtDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
};
const fmtRel = (ts) => {
  const d = toDate(ts);
  if (!d) return '';
  const diff = (Date.now() - d.getTime())/1000;
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric:'auto' });
  const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
  for (const [u,s] of units) if (Math.abs(diff) >= s || u==='second') return rtf.format(Math.round(diff/s*-1), u);
  return '';
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userDoc, setUserDoc] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const fileInputRef = useRef(null);

  // ==== providers & trạng thái liên kết ====
  const providers = useMemo(() => (user?.providerData?.map(p => p.providerId) || []), [user]);
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');

  const nameLockedDays = daysUntil(userDoc?.lastNameChangeAt, 30);
  const canChangeName = nameLockedDays === 0;

  // ==== state cho phần Bình luận gần đây ====
  const [recent, setRecent] = useState([]);
  const [recentCursor, setRecentCursor] = useState(null);
  const [recentHasMore, setRecentHasMore] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [stats, setStats] = useState({ comments: 0, likes: 0, memberSince: null });

  // Hydration gate
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;

      setDisplayName(u.displayName || '');

      // Load doc users/{uid}
      const uref = doc(db, 'users', u.uid);
      const snap = await getDoc(uref);
      const data = snap.exists() ? snap.data() : null;
      setUserDoc(data);

      // Tự tạo doc nếu chưa có (nhưng không ghi đè nếu đang deleted)
      if (!snap.exists()) {
        const base = {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(uref, base, { merge: true });
        setUserDoc(base);
      }

      // Stats & bình luận gần đây
      void computeStats(u.uid, data);
      void loadRecent(u.uid, true);
    });
    return () => unsub();
  }, []);

  const isDeleted = userDoc?.status === 'deleted';

  const showToast = (type, text, ms = 3500) => {
    setToast({ type, text });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), ms);
  };

  // ====== Stats: tổng bình luận, tổng like nhận, memberSince ======
  const computeStats = async (uid, userData) => {
    try {
      // Tổng bình luận
      const cSnap = await getCountFromServer(
        query(collection(db, 'comments'), where('authorId','==',String(uid)))
      );
      const comments = cSnap.data().count || 0;

      // Tổng likes (sum likeCount qua các comment của user) -- phân trang an toàn
      let likes = 0, cursor = null, fetched = 0, page = 250;
      while (true) {
        const qPage = cursor
          ? query(collection(db,'comments'), where('authorId','==',String(uid)), orderBy('createdAt','desc'), startAfter(cursor), limit(page))
          : query(collection(db,'comments'), where('authorId','==',String(uid)), orderBy('createdAt','desc'), limit(page));
        const s = await getDocs(qPage);
        if (s.empty) break;
        s.forEach(d => likes += Number(d.data().likeCount || 0));
        fetched += s.size;
        cursor = s.docs[s.docs.length - 1];
        if (s.size < page) break;
        if (fetched > 4000) break; // giới hạn an toàn
      }

      // memberSince: ưu tiên user.createdAt, fallback bình luận sớm nhất
      let join = userData?.createdAt || null;
      try {
        const firstQ = query(
          collection(db, 'comments'),
          where('authorId', '==', String(uid)),
          orderBy('createdAt', 'asc'),
          limit(1)
        );
        const s = await getDocs(firstQ);
        if (!s.empty) {
          const earliest = s.docs[0].data().createdAt || null;
          const j = toDate(join)?.getTime() ?? Infinity;
          const e = toDate(earliest)?.getTime() ?? Infinity;
          if (!join || (e && e < j)) join = earliest;
        }
      } catch {}

      setStats({ comments, likes, memberSince: join });
    } catch {
      setStats({ comments: 0, likes: 0, memberSince: null });
    }
  };

  // ====== Load bình luận gần đây của chính chủ (phân trang) ======
  const loadRecent = async (uid, reset = false) => {
    if (!uid) return;
    try {
      setRecentLoading(true);
      const pageSize = 12;
      const qBase = query(
        collection(db, 'comments'),
        where('authorId', '==', String(uid)),
        orderBy('createdAt','desc'),
        ...(reset || !recentCursor ? [limit(pageSize)] : [startAfter(recentCursor), limit(pageSize)])
      );
      const s = await getDocs(qBase);
      const items = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecent(prev => reset ? items : [...prev, ...items]);
      setRecentCursor(s.docs[s.docs.length - 1] || null);
      setRecentHasMore(s.size >= pageSize);
    } catch {
      // noop
    } finally {
      setRecentLoading(false);
    }
  };

  // Upload avatar -> API -> Supabase
  const onUploadAvatar = async (e) => {
    if (isDeleted) return showToast('error', 'Tài khoản đã bị xoá. Không thể cập nhật.');
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const blob = await compressImage(file, { maxW: 512, maxH: 512, quality: 0.82, mime: 'image/webp' });
      const buf = await blob.arrayBuffer();

      const resp = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'x-user-uid': user.uid,
          'x-file-name': encodeURIComponent('avatar.webp'),
          'x-content-type': 'image/webp',
        },
        body: buf
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Upload thất bại');

      const url = json.url; // đã có ?v=timestamp
      await updateProfile(user, { photoURL: url });
      setUser({ ...user, photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      showToast('success', 'Đã cập nhật ảnh đại diện!');
    } catch (err) {
      showToast('error', err.message || 'Không thể tải ảnh.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Lưu tên (có xác nhận + khoá 30 ngày)
  const onSave = async () => {
    if (isDeleted) return showToast('error', 'Tài khoản đã bị xoá. Không thể cập nhật.');
    if (!user) return showToast('error', 'Bạn cần đăng nhập.');
    const name = displayName.trim();
    if (!name) return showToast('error', 'Tên hiển thị không được để trống.');
    if (!canChangeName) {
      return showToast('error', `Bạn chỉ có thể đổi tên sau ${nameLockedDays} ngày nữa.`);
    }

    const ok = window.confirm('Bạn chỉ có thể đổi tên mỗi 30 ngày.\nBạn có chắc muốn lưu thay đổi này?');
    if (!ok) return;

    try {
      setSaving(true);
      await updateProfile(user, { displayName: name });
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: name, lastNameChangeAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      );
      setUser({ ...user, displayName: name });
      setUserDoc((prev) => ({ ...(prev || {}), displayName: name, lastNameChangeAt: new Date() }));
      showToast('success', 'Đã lưu tên hiển thị! Bạn chỉ có thể đổi lại sau 30 ngày.');
    } catch (err) {
      showToast('error', err.message || 'Không thể lưu tên.');
    } finally {
      setSaving(false);
    }
  };

  const onResendVerify = async () => {
    try {
      if (!user) return;
      await sendEmailVerification(user);
      showToast('info', 'Đã gửi email xác minh tới hộp thư của bạn.');
    } catch (err) {
      showToast('error', err.message || 'Không thể gửi email xác minh.');
    }
  };

  // Gộp mỗi provider thành 1 nút: nếu đã liên kết → nút đỏ Huỷ liên kết; nếu chưa → nút xanh Liên kết
  const onToggleLinkGoogle = async () => {
    if (isDeleted) return showToast('error', 'Tài khoản đã bị xoá. Không thể thao tác.');
    try {
      if (hasGoogle) {
        const ok = window.confirm('Huỷ liên kết Google?');
        if (!ok) return;
        await unlink(user, 'google.com');
        showToast('success', 'Đã huỷ liên kết Google.');
      } else {
        await linkWithPopup(user, new GoogleAuthProvider());
        showToast('success', 'Đã liên kết Google!');
      }
    } catch (err) {
      showToast('error', err.message || 'Thao tác thất bại.');
    }
  };

  const onToggleLinkGithub = async () => {
    if (isDeleted) return showToast('error', 'Tài khoản đã bị xoá. Không thể thao tác.');
    try {
      if (hasGithub) {
        const ok = window.confirm('Huỷ liên kết GitHub?');
        if (!ok) return;
        await unlink(user, 'github.com');
        showToast('success', 'Đã huỷ liên kết GitHub.');
      } else {
        await linkWithPopup(user, new GithubAuthProvider());
        showToast('success', 'Đã liên kết GitHub!');
      }
    } catch (err) {
      showToast('error', err.message || 'Thao tác thất bại.');
    }
  };

  // Hydration gate (tránh SSR sờ vào user)
  if (!hydrated) {
    return (
      <Layout fullWidth>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
        <nav aria-label="breadcrumb" className="border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
          <div className="max-w-screen-2xl mx-auto px-4 h-11 flex items-center gap-2 text-sm">
            <Link href="/" className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600">
              <FontAwesomeIcon icon={faHome} />
              Home
            </Link>
            <FontAwesomeIcon icon={faChevronRight} className="opacity-60 text-gray-500" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">Hồ sơ</span>
          </div>
        </nav>
        <div className="w-full max-w-screen-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-4">Hồ sơ</h1>
          <p className="text-gray-600 dark:text-gray-300">Đang tải…</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout fullWidth>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
        <nav aria-label="breadcrumb" className="border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
          <div className="max-w-screen-2xl mx-auto px-4 h-11 flex items-center gap-2 text-sm">
            <Link href="/" className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600">
              <FontAwesomeIcon icon={faHome} />
              Home
            </Link>
            <FontAwesomeIcon icon={faChevronRight} className="opacity-60 text-gray-500" />
            <span className="text-gray-900 dark:text-gray-100 font-medium">Hồ sơ</span>
          </div>
        </nav>
        <div className="w-full max-w-screen-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-4">Hồ sơ</h1>
          <p className="text-gray-600 dark:text-gray-300">Bạn cần đăng nhập để xem trang này.</p>
        </div>
      </Layout>
    );
  }

  const avatar = user?.photoURL || null;

  return (
    <Layout fullWidth>
      <Head><title>Hồ sơ – StoreiOS</title></Head>

      {/* Toast */}
      {toast && (
        <div
          className={[
            "fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border",
            toast.type === 'success' ? "bg-emerald-600 text-white border-emerald-700"
            : toast.type === 'error' ? "bg-rose-600 text-white border-rose-700"
            : "bg-gray-900 text-white border-gray-800"
          ].join(' ')}
        >
          {toast.text}
        </div>
      )}

      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="border-b border-gray-200 dark:border-gray-800 bg-white/60 dark:bg-gray-900/60 backdrop-blur">
        <div className="max-w-screen-2xl mx-auto px-4 h-11 flex items-center gap-2 text-sm">
          <Link href="/" className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600">
            <FontAwesomeIcon icon={faHome} />
            Home
          </Link>
          <FontAwesomeIcon icon={faChevronRight} className="opacity-60 text-gray-500" />
          <span className="text-gray-900 dark:text-gray-100 font-medium">Hồ sơ</span>
        </div>
      </nav>

      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của bạn</h1>

        {isDeleted && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200 px-4 py-3">
            Tài khoản này đã bị xoá. Bạn không thể cập nhật thông tin hồ sơ.
          </div>
        )}

        {/* Card hồ sơ */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow">
          <div className="p-6 grid grid-cols-1 md:grid-cols-[160px,1fr] gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt="avatar"
                    className="w-32 h-32 rounded-full object-cover border border-gray-200 dark:border-gray-700"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 opacity-70" />
                  </div>
                )}
                <button
                  onClick={() => !isDeleted && fileInputRef.current?.click()}
                  className={`absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full px-3 py-1.5 text-xs shadow
                    ${isDeleted ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'}
                  `}
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
                  disabled={isDeleted}
                />
              </div>
              {uploading && <div className="mt-2 text-xs text-gray-500">Đang nén & tải ảnh…</div>}
            </div>

            {/* Info */}
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Tên hiển thị</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2"
                placeholder="Tên của bạn"
                disabled={isDeleted || !canChangeName}
              />
              {/* Tooltip dưới input: mô tả luật đổi tên */}
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <FontAwesomeIcon icon={faCircleInfo} className="opacity-70" />
                {canChangeName
                  ? 'Bạn có thể đổi tên bây giờ. Sau khi đổi sẽ khoá 30 ngày.'
                  : `Bạn có thể đổi lại sau ${nameLockedDays} ngày.`}
              </div>

              {/* Quick stats */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarDays} /> Ngày tham gia
                  </div>
                  <div className="mt-1 font-medium">{fmtDate(stats.memberSince)}</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faComment} /> Tổng bình luận
                  </div>
                  <div className="mt-1 font-medium">{stats.comments}</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHeart} /> Lượt thích nhận
                  </div>
                  <div className="mt-1 font-medium">{stats.likes}</div>
                </div>
              </div>

              {/* Liên kết tài khoản: MỖI PROVIDER 1 NÚT */}
              <div className="mt-6">
                <h2 className="text-base font-semibold mb-2">Liên kết tài khoản</h2>

                <div className="flex flex-col sm:flex-row gap-3">
                  {/* GOOGLE: 1 nút duy nhất */}
                  <button
                    onClick={onToggleLinkGoogle}
                    disabled={isDeleted}
                    className={[
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
                      hasGoogle
                        ? "border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100"
                        : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    ].join(' ')}
                  >
                    <FontAwesomeIcon icon={faGoogle} />
                    {hasGoogle ? 'Huỷ liên kết Google' : 'Liên kết Google'}
                  </button>

                  {/* GITHUB: 1 nút duy nhất */}
                  <button
                    onClick={onToggleLinkGithub}
                    disabled={isDeleted}
                    className={[
                      "inline-flex items-center gap-2 px-3 py-2 rounded-lg border",
                      hasGithub
                        ? "border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100"
                        : "border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                    ].join(' ')}
                  >
                    <FontAwesomeIcon icon={faGithub} />
                    {hasGithub ? 'Huỷ liên kết GitHub' : 'Liên kết GitHub'}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* ===== Bình luận gần đây (cuộn tới bình luận giống [uid].js) ===== */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-3">Bình luận gần đây</h2>

          {recent.length === 0 && !recentLoading && (
            <div className="text-sm text-gray-500 dark:text-gray-400">Bạn chưa có bình luận nào.</div>
          )}

          <ul className="grid md:grid-cols-2 gap-3">
            {recent.map(c => {
              // Giống [uid].js: dùng hash #comment-<id>
              const rawSlug = String(c.postSlug || c.postId || '').trim();
              const slug = rawSlug.replace(/^\/+/, '');
              const href = slug ? `/${encodeURI(slug)}#comment-${encodeURIComponent(c.id)}` : '#';
              return (
                <li key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="text-xs text-gray-600 dark:text-gray-400">{fmtRel(c.createdAt)}</div>
                  <p className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words overflow-hidden">
                    {String(c.content || '')}
                  </p>
                  {slug && (
                    <div className="mt-3 text-sm">
                      <Link href={href} className="text-sky-700 dark:text-sky-300 hover:underline" title="Xem trong bài viết & cuộn đến bình luận">
                        Xem trong bài viết
                      </Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {recentHasMore && (
            <div className="mt-4">
              <button
                onClick={() => loadRecent(user?.uid, false)}
                disabled={recentLoading}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {recentLoading ? 'Đang tải…' : 'Tải thêm'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}