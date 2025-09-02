// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';

import Layout from '../components/Layout'; // Header + Footer đẹp, đồng bộ giao diện

import { auth, db, storage } from '../lib/firebase-client';
import {
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  updateEmail,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  unlink,
  reauthenticateWithPopup,
  deleteUser,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
} from 'firebase/storage';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faCheckCircle,
  faTimesCircle,
  faCloudArrowUp,
  faLink,
  faUnlink,
  faTriangleExclamation,
  faShieldHalved,
  faRightFromBracket,
  faTrash,
  faEnvelope,
  faKey,
  faCertificate,
  faMedal,
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

// ---- Helper: nén + cắt vuông ảnh trước khi upload (canvas, không cần lib ngoài)
async function compressAndSquareCrop(file, maxSize = 512, quality = 0.85) {
  const blobURL = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = blobURL;
    });

    const side = Math.min(img.width, img.height);
    const sx = (img.width - side) / 2;
    const sy = (img.height - side) / 2;

    const finalSize = Math.min(maxSize, side);
    const canvas = document.createElement('canvas');
    canvas.width = finalSize;
    canvas.height = finalSize;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, sx, sy, side, side, 0, 0, finalSize, finalSize);

    const out = await new Promise((res) =>
      canvas.toBlob(
        (b) => res(b || file),
        'image/jpeg',
        quality
      )
    );
    return out || file;
  } finally {
    URL.revokeObjectURL(blobURL);
  }
}

// ---- Helper: log sự kiện bảo mật/hoạt động
async function fetchPublicIP() {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    const j = await r.json();
    return j.ip || '';
  } catch {
    return '';
  }
}

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

  // Bảo mật / reauth
  const [reauthOpen, setReauthOpen] = useState(false);
  const pendingActionRef = useRef(null);
  const [ip, setIp] = useState('');
  const [ua] = useState(typeof navigator !== 'undefined' ? navigator.userAgent : '');

  // Đổi email / đặt lại mật khẩu
  const [newEmail, setNewEmail] = useState('');

  // Nhật ký & thống kê
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ comments: 0, likes: 0, badges: [] });

  // Toast tiện dụng
  const showToast = (type, text, ms = 3000) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  // Load user
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;

      setDisplayName(u.displayName || '');

      // tạo/lấy doc user
      const uref = doc(db, 'users', u.uid);
      const snap = await getDoc(uref);
      if (!snap.exists()) {
        await setDoc(
          uref,
          {
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || '',
            photoURL: u.photoURL || '',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            badges: [], // cho hiển thị huy hiệu
          },
          { merge: true }
        );
      }

      // IP để log
      const myip = await fetchPublicIP();
      setIp(myip);

      // Log đăng nhập / truy cập trang hồ sơ
      await addDoc(collection(db, 'user_logs', u.uid, 'events'), {
        type: 'profile_open',
        provider: (u.providerData?.[0]?.providerId) || 'password',
        ip: myip,
        ua,
        ts: serverTimestamp(),
      });

      // Tải nhật ký gần đây
      const ql = query(
        collection(db, 'user_logs', u.uid, 'events'),
        orderBy('ts', 'desc'),
        limit(10)
      );
      const lSnap = await getDocs(ql);
      setLogs(lSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      // Thống kê cá nhân (tham khảo cấu trúc collection "comments")
      try {
        // Đếm bình luận
        const qc = query(collection(db, 'comments'), where('authorId', '==', u.uid));
        const count = await getCountFromServer(qc);
        let likesTotal = 0;
        // cộng tổng likesCount (nếu có)
        const cDocs = await getDocs(qc);
        cDocs.forEach((d) => {
          const v = d.data()?.likesCount || 0;
          likesTotal += Number.isFinite(v) ? v : 0;
        });

        const uDoc = await getDoc(doc(db, 'users', u.uid));
        const badges = (uDoc.exists() && Array.isArray(uDoc.data().badges)) ? uDoc.data().badges : [];

        setStats({ comments: count.data().count || 0, likes: likesTotal, badges });
      } catch {
        // im lặng nếu chưa có collection
        setStats((s) => ({ ...s }));
      }
    });
    return () => unsub();
  }, [ua]);

  // ===== Handlers =====
  const onUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      // nén & crop vuông
      const processed = await compressAndSquareCrop(file, 640, 0.85);
      const ext = 'jpg';
      const path = `avatars/${user.uid}/${Date.now()}.${ext}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, processed, { contentType: 'image/jpeg' });
      const url = await getDownloadURL(r);

      await updateProfile(user, { photoURL: url });
      await setDoc(
        doc(db, 'users', user.uid),
        { photoURL: url, updatedAt: serverTimestamp() },
        { merge: true }
      );
      setUser({ ...user, photoURL: url });
      showToast('success', 'Đã cập nhật ảnh đại diện!');

      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'avatar_update',
        ip,
        ua,
        ts: serverTimestamp(),
      });
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSaveBasic = async () => {
    if (!displayName.trim()) return showToast('error', 'Tên hiển thị không được để trống.');
    try {
      setSaving(true);
      await updateProfile(user, { displayName: displayName.trim() });
      await setDoc(
        doc(db, 'users', user.uid),
        { displayName: displayName.trim(), updatedAt: serverTimestamp() },
        { merge: true }
      );
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
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'email_verify_send',
        ip,
        ua,
        ts: serverTimestamp(),
      });
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const requireReauth = (actionFn) => {
    pendingActionRef.current = actionFn;
    setReauthOpen(true);
  };

  const doReauth = async (type) => {
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await reauthenticateWithPopup(user, provider);
      setReauthOpen(false);
      showToast('success', 'Xác thực lại thành công!');
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'reauth_success',
        provider: type,
        ip,
        ua,
        ts: serverTimestamp(),
      });
      if (pendingActionRef.current) {
        const fn = pendingActionRef.current;
        pendingActionRef.current = null;
        await fn();
      }
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const onChangeEmail = async () => {
    const email = newEmail.trim();
    if (!email) return showToast('error', 'Vui lòng nhập email mới.');
    const perform = async () => {
      await updateEmail(user, email);
      await setDoc(doc(db, 'users', user.uid), { email, updatedAt: serverTimestamp() }, { merge: true });
      showToast('success', 'Đã đổi email!');
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'email_change',
        ip,
        ua,
        ts: serverTimestamp(),
      });
      setNewEmail('');
    };
    try {
      await perform();
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        requireReauth(perform);
      } else {
        showToast('error', err.message);
      }
    }
  };

  const onResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      showToast('success', 'Đã gửi email đặt lại mật khẩu!');
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'password_reset_send',
        ip,
        ua,
        ts: serverTimestamp(),
      });
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const onLink = async (type) => {
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await linkWithPopup(user, provider);
      showToast('success', `Đã liên kết ${type === 'google' ? 'Google' : 'GitHub'}!`);
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'provider_link',
        provider: type,
        ip,
        ua,
        ts: serverTimestamp(),
      });
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const onUnlink = async (providerId) => {
    const perform = async () => {
      await unlink(user, providerId);
      showToast('success', 'Đã huỷ liên kết!');
      await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
        type: 'provider_unlink',
        provider: providerId,
        ip,
        ua,
        ts: serverTimestamp(),
      });
    };
    try {
      await perform();
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        requireReauth(perform);
      } else {
        showToast('error', err.message);
      }
    }
  };

  const cleanupUserStorage = async (uid) => {
    try {
      const base = storageRef(storage, `avatars/${uid}`);
      const all = await listAll(base);
      await Promise.all(all.items.map((it) => deleteObject(it).catch(() => {})));
    } catch {
      // ignore
    }
  };

  const onDeleteAccount = async () => {
    if (!confirm('Bạn chắc chắn muốn xoá tài khoản? Hành động này không thể hoàn tác.')) return;

    const perform = async () => {
      try {
        // dọn dữ liệu trước
        await cleanupUserStorage(user.uid);
        await deleteDoc(doc(db, 'users', user.uid));
        // log (cố gắng, có thể fail nếu rule chặn)
        try {
          await addDoc(collection(db, 'user_logs', user.uid, 'events'), {
            type: 'account_delete',
            ip,
            ua,
            ts: serverTimestamp(),
          });
        } catch {}
        await deleteUser(user);
        showToast('success', 'Đã xoá tài khoản. Hẹn gặp lại!');
      } catch (err) {
        showToast('error', err.message);
      }
    };

    try {
      await perform();
    } catch (err) {
      if (err.code === 'auth/requires-recent-login') {
        requireReauth(perform);
      } else {
        showToast('error', err.message);
      }
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

  return (
    <Layout>
      <Head><title>Hồ sơ – StoreiOS</title></Head>

      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
            ${toast.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-200'
              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100'}`}
        >
          {toast.text}
        </div>
      )}

      {/* Reauth modal */}
      {reauthOpen && (
        <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-2xl">
            <h3 className="text-lg font-semibold mb-2">Xác thực lại</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Vui lòng xác thực lại để tiếp tục thao tác nhạy cảm.
            </p>
            <div className="grid gap-2">
              <button
                onClick={() => doReauth('google')}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faGoogle} /> Tiếp tục với Google
              </button>
              <button
                onClick={() => doReauth('github')}
                className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faGithub} /> Tiếp tục với GitHub
              </button>
            </div>
            <button
              onClick={() => setReauthOpen(false)}
              className="mt-4 w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Huỷ
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Hồ sơ của bạn</h1>

        {/* Card hồ sơ + avatar */}
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
              {uploading && <div className="mt-2 text-xs text-gray-500">Đang xử lý & tải ảnh…</div>}
            </div>

            {/* Thông tin */}
            <div>
              <div className="grid gap-4">
                <div>
                  <label className="text-sm text-gray-500">Email hiện tại</label>
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
                  onClick={onSaveBasic}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
                >
                  {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
                </button>
              </div>
            </div>
          </div>

          {/* Đổi email & đặt lại mật khẩu */}
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold mb-3">Bảo mật nhanh</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <FontAwesomeIcon icon={faEnvelope} />
                  Đổi email đăng nhập
                </div>
                <div className="flex gap-2">
                  <input
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Email mới"
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  />
                  <button
                    onClick={onChangeEmail}
                    className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
                  >
                    Đổi
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Có thể yêu cầu xác thực lại.</p>
              </div>

              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-2 font-medium mb-2">
                  <FontAwesomeIcon icon={faKey} />
                  Đặt lại mật khẩu
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Gửi email đặt lại mật khẩu đến địa chỉ hiện tại.</p>
                <button
                  onClick={onResetPassword}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  Gửi email đặt lại
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

          {/* Bảo mật & xoá tài khoản */}
          <div className="px-6 pb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <FontAwesomeIcon icon={faShieldHalved} /> Bảo mật nâng cao
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={onDeleteAccount}
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faTrash} />
                Xoá tài khoản
              </button>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <FontAwesomeIcon icon={faTriangleExclamation} />
                Thao tác nhạy cảm có thể yêu cầu xác thực lại.
              </span>
            </div>
          </div>
        </div>

        {/* Thống kê & Nhật ký */}
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

          {/* Nhật ký hoạt động gần đây */}
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Hoạt động gần đây</h3>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có hoạt động.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-800">
                      <th className="py-2 pr-4">Thời gian</th>
                      <th className="py-2 pr-4">Sự kiện</th>
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">IP</th>
                      <th className="py-2">Thiết bị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2 pr-4">
                          {l.ts?.toDate ? l.ts.toDate().toLocaleString() : '-'}
                        </td>
                        <td className="py-2 pr-4">{l.type}</td>
                        <td className="py-2 pr-4">{l.provider || '-'}</td>
                        <td className="py-2 pr-4">{l.ip || '-'}</td>
                        <td className="py-2 truncate max-w-[240px]">{l.ua || '-'}</td>
                      </tr>
                    ))}
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