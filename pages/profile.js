// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout'; // Header + Footer
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
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faCheckCircle,
  faTimesCircle,
  faCloudArrowUp,
  faLink,
  faUnlink,
  faHome,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [userDoc, setUserDoc] = useState(null); // đọc users/{uid} để biết status
  const [hydrated, setHydrated] = useState(false); // 🔒 tránh SSR đụng vào user
  const fileInputRef = useRef(null);

  // providers
  const providers = useMemo(() => (user?.providerData?.map(p => p.providerId) || []), [user]);
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');

  // Hydration gate: chỉ render nội dung sau khi client hydrate xong
  useEffect(() => { setHydrated(true); }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;

      setDisplayName(u.displayName || '');

      // 🔒 Lấy doc user để kiểm tra status trước khi ghi
      const uref = doc(db, 'users', u.uid);
      const snap = await getDoc(uref);
      setUserDoc(snap.exists() ? snap.data() : null);

      // Chỉ tạo doc nếu CHƯA tồn tại; nếu đang deleted thì KHÔNG ghi đè
      if (!snap.exists()) {
        await setDoc(uref, {
          uid: u.uid,
          email: u.email || '',
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        setUserDoc({ uid: u.uid, email: u.email || '', displayName: u.displayName || '', photoURL: u.photoURL || '' });
      }
    });
    return () => unsub();
  }, []);

  const isDeleted = userDoc?.status === 'deleted';

  const showToast = (type, text, ms = 3000) => {
    setToast({ type, text });
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => setToast(null), ms);
  };

  // ✅ Upload avatar qua API -> Supabase Storage, path cố định (ghi đè)
  const onUploadAvatar = async (e) => {
    if (isDeleted) { showToast('error', 'Tài khoản đã bị xoá. Không thể cập nhật.'); return; }
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      const buf = await file.arrayBuffer();
      const resp = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: {
          'x-user-uid': user.uid,
          'x-file-name': encodeURIComponent(file.name),
          'x-content-type': file.type || 'application/octet-stream',
        },
        body: buf
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error || 'Upload thất bại');
      const url = json.url; // đã có ?v=timestamp để phá cache

      await updateProfile(user, { photoURL: url });
      setUser({ ...user, photoURL: url });
      if (!isDeleted) {
        await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      }
      showToast('success', 'Đã cập nhật ảnh đại diện!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSave = async () => {
    if (isDeleted) { showToast('error', 'Tài khoản đã bị xoá. Không thể cập nhật.'); return; }
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
    if (isDeleted) { showToast('error', 'Tài khoản đã bị xoá. Không thể liên kết.'); return; }
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await linkWithPopup(user, provider);
      showToast('success', `Đã liên kết ${type === 'google' ? 'Google' : 'GitHub'}!`);
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const onUnlink = async (providerId) => {
    if (isDeleted) { showToast('error', 'Tài khoản đã bị xoá. Không thể huỷ liên kết.'); return; }
    try {
      await unlink(user, providerId);
      showToast('success', 'Đã huỷ liên kết!');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  // 🛡️ Hydration gate: chặn toàn bộ khi SSR/SSG (tránh user=null ở server)
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

  // Khi đã hydrate: nếu chưa đăng nhập
  if (!user) {
    return (
      <Layout fullWidth>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
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
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
          bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
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

      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của bạn</h1>

        {/* Nếu đã bị xoá mềm, hiển thị banner khóa chỉnh sửa */}
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
              {uploading && <div className="mt-2 text-xs text-gray-500">Đang tải ảnh…</div>}
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
                disabled={isDeleted}
              />

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={onSave}
                  disabled={saving || isDeleted}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${isDeleted ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-900 hover:bg-black dark:bg-white dark:text-gray-900 dark:hover:opacity-90'}`}
                >
                  {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>

                <span className="inline-flex items-center gap-2 text-sm">
                  {user?.emailVerified ? (
                    <span className="text-emerald-600 inline-flex items-center gap-1">
                      <FontAwesomeIcon icon={faCheckCircle} /> Email đã xác minh
                    </span>
                  ) : (
                    <>
                      <span className="text-amber-600 inline-flex items-center gap-1">
                        <FontAwesomeIcon icon={faTimesCircle} /> Chưa xác minh email
                      </span>
                      <button
                        onClick={onResendVerify}
                        className="text-sky-700 dark:text-sky-300 hover:underline"
                      >
                        Gửi lại email xác minh
                      </button>
                    </>
                  )}
                </span>
              </div>

              {/* Liên kết tài khoản */}
              <div className="mt-6">
                <h2 className="text-base font-semibold mb-2">Liên kết tài khoản</h2>
                <div className="flex flex-wrap gap-3">
                  {/* Google */}
                  {hasGoogle ? (
                    <button
                      onClick={() => onUnlink('google.com')}
                      disabled={isDeleted}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${isDeleted ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <FontAwesomeIcon icon={faGoogle} />
                      <FontAwesomeIcon icon={faUnlink} className="opacity-80" />
                      Huỷ liên kết Google
                    </button>
                  ) : (
                    <button
                      onClick={() => onLink('google')}
                      disabled={isDeleted}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${isDeleted ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <FontAwesomeIcon icon={faGoogle} />
                      <FontAwesomeIcon icon={faLink} className="opacity-80" />
                      Liên kết Google
                    </button>
                  )}

                  {/* GitHub */}
                  {hasGithub ? (
                    <button
                      onClick={() => onUnlink('github.com')}
                      disabled={isDeleted}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${isDeleted ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <FontAwesomeIcon icon={faGithub} />
                      <FontAwesomeIcon icon={faUnlink} className="opacity-80" />
                      Huỷ liên kết GitHub
                    </button>
                  ) : (
                    <button
                      onClick={() => onLink('github')}
                      disabled={isDeleted}
                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${isDeleted ? 'border-gray-300 text-gray-400 cursor-not-allowed' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    >
                      <FontAwesomeIcon icon={faGithub} />
                      <FontAwesomeIcon icon={faLink} className="opacity-80" />
                      Liên kết GitHub
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* (Tùy chọn) Thông điệp bổ sung */}
          {/* <div className="px-6 pb-6 text-sm text-rose-600 dark:text-rose-300">...</div> */}
        </div>
      </div>
    </Layout>
  );
}