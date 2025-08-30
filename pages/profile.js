// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
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
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserCircle, faCheckCircle, faTimesCircle, faCloudArrowUp, faLink, faUnlink } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // providers
  const providers = useMemo(() => (user?.providerData?.map(p => p.providerId) || []), [user]);
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;
      setDisplayName(u.displayName || '');
      // tạo/lấy doc user
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
        }, { merge: true });
      }
    });
    return () => unsub();
  }, []);

  const showToast = (type, text, ms = 3000) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  if (!user) {
    return (
      <>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
        <div className="w-full max-w-screen-md mx-auto px-4 py-16">
          <h1 className="text-2xl font-bold mb-4">Hồ sơ</h1>
          <p className="text-gray-600 dark:text-gray-300">Bạn cần đăng nhập để xem trang này.</p>
        </div>
      </>
    );
  }

  const onUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const path = `avatars/${user.uid}/${Date.now()}_${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      setUser({ ...user, photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      showToast('success', 'Đã cập nhật ảnh đại diện!');
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSave = async () => {
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
      // user-cancelled, already-linked, etc.
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

  const avatar = user.photoURL || null;

  return (
    <>
      <Head><title>Hồ sơ – StoreiOS</title></Head>
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
          bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
          {toast.text}
        </div>
      )}

      <div className="w-full max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của bạn</h1>

        {/* Card hồ sơ */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow">
          <div className="p-6 grid grid-cols-1 md:grid-cols-[160px,1fr] gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-32 h-32 rounded-full object-cover border border-gray-200 dark:border-gray-700" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-32 h-32 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 opacity-70" />
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
            </div>

            {/* Form info */}
            <div>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm text-gray-500">Email</label>
                  <div className="mt-1 text-sm">{user.email}</div>
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
                <div className="flex items-center gap-3">
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

            <p className="mt-3 text-xs text-gray-500">
              * Nếu email của bạn đã tồn tại với nhà cung cấp khác, hệ thống sẽ yêu cầu đăng nhập bằng nhà cung cấp cũ để liên kết.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}