// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import { auth, db, storage } from '../lib/firebase-client';
import {
  updateProfile,
  updateEmail,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  EmailAuthProvider,
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  linkWithPopup,
  unlink,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getCountFromServer,
  limit,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCheckCircle, faCloudArrowUp, faLink, faUnlink,
  faShieldHalved, faEnvelope, faKey, faFloppyDisk, faCalendarDays,
  faCircleDot, faRotateRight, faTriangleExclamation, faUserPen,
  faMagnifyingGlass, faArrowUpRightFromSquare
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

/** Helpers **/
const toDate = (any) => {
  try {
    if (!any) return null;
    if (any.seconds) return new Date(any.seconds * 1000);
    if (typeof any === 'number') return new Date(any);
    if (typeof any === 'string') return new Date(any);
    if (any instanceof Date) return any;
  } catch {}
  return null;
};
const relTime = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  const units = [['năm',31536000],['tháng',2592000],['tuần',604800],['ngày',86400],['giờ',3600],['phút',60],['giây',1]];
  for (const [label, s] of units) {
    if (Math.abs(diff) >= s || label === 'giây') {
      const v = Math.round(diff / s);
      if (v <= 0) return 'vừa xong';
      return `${v} ${label} trước`;
    }
  }
  return '';
};

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  // UI state
  const [securityOpen, setSecurityOpen] = useState(false);

  // Stats & meta
  const [joinedAt, setJoinedAt] = useState(null);
  const [activeLabel, setActiveLabel] = useState('');
  const [commentsCount, setCommentsCount] = useState(0);
  const [likesReceived, setLikesReceived] = useState(0);

  // Email change / reauth
  const [newEmail, setNewEmail] = useState('');
  const [passwordForReauth, setPasswordForReauth] = useState('');
  const [emailBusy, setEmailBusy] = useState(false);

  // Activity log
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(true);

  // Providers
  const providers = useMemo(() => (user?.providerData?.map(p => p.providerId) || []), [user]);
  const hasGoogle = providers.includes('google.com');
  const hasGithub = providers.includes('github.com');
  const hasPassword = providers.includes('password');

  /** Toast helper */
  const showToast = (type, text, ms = 3000) => {
    setToast({ type, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  /** Bootstrap current user + ensure users/{uid} doc exists */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (!u) return;

      setDisplayName(u.displayName || '');

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
        }, { merge: true }); // tạo doc nếu thiếu  [oai_citation:12‡profile.js](file-service://file-5uidKkaSVQhAzrxFkGQJGr)
      }

      // Join date: ưu tiên users.createdAt; rơi xuống auth.metadata.creationTime
      const docData = (await getDoc(uref)).data();
      const created = toDate(docData?.createdAt) || (u.metadata?.creationTime ? new Date(u.metadata.creationTime) : null);
      setJoinedAt(created || null);

      // Trạng thái hoạt động: nếu là chính chủ & đang on-page thì coi là đang hoạt động
      const setPresence = () => {
        const active = document.visibilityState === 'visible';
        setActiveLabel(active ? 'Đang hoạt động' : (u.metadata?.lastSignInTime ? relTime(new Date(u.metadata.lastSignInTime)) : ''));
      };
      setPresence();
      const vis = () => setPresence();
      const t = setInterval(setPresence, 30000);
      document.addEventListener('visibilitychange', vis);
      window.addEventListener('focus', vis);
      window.addEventListener('blur', vis);
      // cleanup
      return () => {
        clearInterval(t);
        document.removeEventListener('visibilitychange', vis);
        window.removeEventListener('focus', vis);
        window.removeEventListener('blur', vis);
      };
    });
    return () => unsub();
  }, []);

  /** Load thống kê */
  useEffect(() => {
    (async () => {
      if (!user) return;
      try {
        // Tổng bình luận
        const qCount = query(collection(db, 'comments'), whereEq('authorId', user.uid)); // small helper below
        const snapCount = await getCountFromServer(qCount);
        setCommentsCount(snapCount.data().count || 0);

        // Like nhận được: lấy 200 comment gần nhất và cộng likeCount
        const qLikes = query(
          collection(db, 'comments'),
          whereEq('authorId', user.uid),
          orderBy('createdAt', 'desc'),
          limit(200)
        );
        const likesSnap = await getDocs(qLikes);
        let sum = 0;
        likesSnap.forEach(docu => { sum += Math.max(0, Number(docu.data().likeCount || 0)); });
        setLikesReceived(sum);
      } catch (e) {
        // fallback yên lặng
      }
    })();
  }, [user]);

  /** Load nhật ký hoạt động: ưu tiên user_logs; nếu trống → fallback từ bình luận của user */
  useEffect(() => {
    (async () => {
      if (!user) return;
      setEventsLoading(true);
      try {
        const qLog = query(
          collection(db, 'user_logs', user.uid, 'events'),
          orderBy('createdAt', 'desc'),
          limit(30)
        );
        const snap = await getDocs(qLog);
        let rows = [];
        snap.forEach(d => rows.push({ id: d.id, ...d.data() }));
        if (rows.length === 0) {
          // fallback: lấy 20 bình luận gần nhất của user để hiển thị dạng sự kiện
          const qC = query(
            collection(db, 'comments'),
            whereEq('authorId', user.uid),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const sc = await getDocs(qC);
          sc.forEach(d => rows.push({
            id: d.id,
            type: 'comment',
            createdAt: d.data().createdAt,
            userAgent: navigator.userAgent,
            provider: (user.providerData?.[0]?.providerId || 'unknown'),
            note: (d.data().content || '').slice(0, 140),
            postId: String(d.data().postId || ''),
          }));
        }
        setEvents(rows);
      } catch (e) {
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    })();
  }, [user]);

  // Firestore where helper that avoids undefined crash
  function whereEq(field, value) {
    const { where } = require('firebase/firestore'); // lazy to avoid SSR mismatch
    return where(field, '==', value);
  }

  /** Upload avatar (giữ logic cũ) */
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
  }; // (tham chiếu code cũ)  [oai_citation:11‡profile.js](file-service://file-5uidKkaSVQhAzrxFkGQJGr)

  /** Lưu tên hiển thị */
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
  }; // (tham chiếu code cũ)  [oai_citation:10‡profile.js](file-service://file-5uidKkaSVQhAzrxFkGQJGr)

  /** Re-auth helper */
  const reauth = async () => {
    if (!user) return;
    try {
      if (hasPassword && passwordForReauth) {
        const cred = EmailAuthProvider.credential(user.email, passwordForReauth);
        await reauthenticateWithCredential(user, cred);
      } else if (hasGoogle) {
        await reauthenticateWithPopup(user, new GoogleAuthProvider());
      } else if (hasGithub) {
        await reauthenticateWithPopup(user, new GithubAuthProvider());
      } else {
        throw new Error('Không có phương thức re-auth phù hợp. Hãy đặt mật khẩu cho tài khoản hoặc liên kết Google/GitHub.');
      }
    } catch (e) {
      throw e;
    }
  };

  /** Đổi email */
  const onChangeEmail = async () => {
    if (!newEmail.trim()) return showToast('error', 'Nhập email mới.');
    setEmailBusy(true);
    try {
      await reauth();
      await updateEmail(user, newEmail.trim());
      await setDoc(doc(db, 'users', user.uid), { email: newEmail.trim(), updatedAt: serverTimestamp() }, { merge: true });
      showToast('success', 'Đã đổi email! Hãy kiểm tra hộp thư để xác minh.');
      await sendEmailVerification(auth.currentUser);
    } catch (e) {
      showToast('error', e.message);
    } finally {
      setEmailBusy(false);
    }
  };

  /** Reset mật khẩu */
  const onResetPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      showToast('success', `Đã gửi email đặt lại mật khẩu tới ${user.email}`);
    } catch (e) {
      showToast('error', e.message);
    }
  };

  /** Link / Unlink providers */
  const onLink = async (type) => {
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await linkWithPopup(user, provider);
      showToast('success', `Đã liên kết ${type === 'google' ? 'Google' : 'GitHub'}!`);
    } catch (err) {
      showToast('error', err.message);
    }
  };
  const onUnlink = async (pid) => {
    try {
      await unlink(user, pid);
      showToast('success', 'Đã huỷ liên kết!');
    } catch (err) {
      showToast('error', err.message);
    }
  };

  const avatar = user?.photoURL || null;

  return (
    <>
      <Head><title>Hồ sơ – StoreiOS</title></Head>

      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
          bg-white border-gray-200 text-gray-800">
          {toast.text}
        </div>
      )}

      {/* Khối đầu trang có màu tươi */}
      <div className="w-full bg-gradient-to-r from-sky-50 via-white to-emerald-50 border-b border-gray-200">
        <div className="max-w-screen-2xl mx-auto px-4 py-6 flex items-center gap-4">
          <span className="inline-flex w-10 h-10 items-center justify-center rounded-full bg-sky-100 text-sky-700">
            <FontAwesomeIcon icon={faUserPen} />
          </span>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Hồ sơ cá nhân</h1>
            <p className="text-sm text-gray-600">Quản lý thông tin, bảo mật, thống kê & hoạt động của bạn.</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-screen-2xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Hồ sơ cơ bản */}
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5" />
              <span className="font-semibold">Thông tin cơ bản</span>
            </div>
            <a href="/about" className="text-white/80 hover:text-white text-xs inline-flex items-center gap-1">
              <FontAwesomeIcon icon={faMagnifyingGlass} />
              Trợ giúp
              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3 h-3" />
            </a>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-[180px,1fr] gap-6">
            {/* Avatar */}
            <div className="flex flex-col items-center md:items-start">
              <div className="relative">
                {avatar ? (
                  <img src={avatar} alt="avatar" className="w-36 h-36 rounded-full object-cover border border-gray-200" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-36 h-36 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50">
                    <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 translate-x-1/4 translate-y-1/4 rounded-full px-3 py-1.5 text-xs bg-gray-900 text-white shadow"
                >
                  <FontAwesomeIcon icon={faCloudArrowUp} className="mr-1" />
                  Tải ảnh
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
              </div>
              {uploading && <div className="mt-2 text-xs text-gray-500">Đang tải ảnh…</div>}
            </div>

            {/* Form */}
            <div className="grid gap-4">
              <div>
                <label className="text-sm text-gray-600">Email</label>
                <div className="mt-1 text-sm">{user?.email}</div>
              </div>

              <div>
                <label htmlFor="displayName" className="text-sm text-gray-600">Tên hiển thị</label>
                <input
                  id="displayName"
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Tên của bạn"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-emerald-700">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span className="text-sm">{user?.emailVerified ? 'Email đã xác minh' : 'Email chưa xác minh'}</span>
                </div>
                {!user?.emailVerified && (
                  <button onClick={() => sendEmailVerification(user).then(()=>showToast('success','Đã gửi email xác minh!')).catch(e=>showToast('error',e.message))}
                          className="justify-self-end px-3 py-1.5 rounded-lg text-sm bg-amber-600 text-white hover:bg-amber-700">
                    Gửi lại email xác minh
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
                  <FontAwesomeIcon icon={faFloppyDisk} className="mr-2" />
                  {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}
                </button>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            <h3 className="text-base font-semibold mb-3">Đăng nhập liên kết</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Google */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGoogle} />
                  <span>Google</span>
                </div>
                {hasGoogle ? (
                  <button onClick={() => onUnlink('google.com')} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">
                    <FontAwesomeIcon icon={faUnlink} className="mr-2" />Huỷ
                  </button>
                ) : (
                  <button onClick={() => onLink('google')} className="px-3 py-1.5 rounded bg-gray-900 text-white hover:opacity-90">
                    <FontAwesomeIcon icon={faLink} className="mr-2" />Liên kết
                  </button>
                )}
              </div>
              {/* GitHub */}
              <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faGithub} />
                  <span>GitHub</span>
                </div>
                {hasGithub ? (
                  <button onClick={() => onUnlink('github.com')} className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">
                    <FontAwesomeIcon icon={faUnlink} className="mr-2" />Huỷ
                  </button>
                ) : (
                  <button onClick={() => onLink('github')} className="px-3 py-1.5 rounded bg-gray-900 text-white hover:opacity-90">
                    <FontAwesomeIcon icon={faLink} className="mr-2" />Liên kết
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Cột phải: Trạng thái, tham gia, thống kê */}
        <aside className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faShieldHalved} />
            <span className="font-semibold">Tổng quan tài khoản</span>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <FontAwesomeIcon icon={faCircleDot} />
              </span>
              <div>
                <div className="text-sm text-gray-500">Trạng thái</div>
                <div className="font-medium">{activeLabel || '--'}</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex w-9 h-9 items-center justify-center rounded-full bg-sky-50 text-sky-700">
                <FontAwesomeIcon icon={faCalendarDays} />
              </span>
              <div>
                <div className="text-sm text-gray-500">Ngày tham gia</div>
                <div className="font-medium">{joinedAt ? joinedAt.toLocaleDateString('vi-VN') : '--'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-sm text-gray-500">Bình luận</div>
                <div className="text-2xl font-bold">{commentsCount}</div>
              </div>
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="text-sm text-gray-500">Lượt like nhận</div>
                <div className="text-2xl font-bold">{likesReceived}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Hàng bảo mật: đổi email & reset mật khẩu */}
        <section className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white px-6 py-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faKey} />
            <span className="font-semibold">Bảo mật & đăng nhập</span>
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Đổi email */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="font-semibold mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faEnvelope} /> Đổi email</div>
              <input
                className="w-full mb-3 rounded-lg border border-gray-300 px-3 py-2"
                placeholder="Email mới"
                type="email"
                value={newEmail}
                onChange={e=>setNewEmail(e.target.value)}
              />
              {hasPassword && (
                <input
                  className="w-full mb-3 rounded-lg border border-gray-300 px-3 py-2"
                  placeholder="Mật khẩu hiện tại (để re‑auth)"
                  type="password"
                  value={passwordForReauth}
                  onChange={e=>setPasswordForReauth(e.target.value)}
                />
              )}
              {!hasPassword && (
                <div className="text-xs text-gray-600 mb-3">
                  Tài khoản không dùng mật khẩu. Hệ thống sẽ mở popup Google/GitHub để xác thực lại.
                </div>
              )}
              <button onClick={onChangeEmail} disabled={emailBusy}
                      className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700">
                {emailBusy ? 'Đang xử lý…' : 'Đổi email'}
              </button>
            </div>

            {/* Reset mật khẩu */}
            <div className="rounded-xl border border-gray-200 p-4">
              <div className="font-semibold mb-3 flex items-center gap-2"><FontAwesomeIcon icon={faRotateRight} /> Đặt lại mật khẩu</div>
              <p className="text-sm text-gray-600 mb-3">Gửi email đặt lại mật khẩu tới địa chỉ đang dùng.</p>
              <button onClick={onResetPassword} className="px-4 py-2 rounded-lg bg-rose-600 text-white hover:bg-rose-700">
                Gửi email đặt lại mật khẩu
              </button>
              {!hasPassword && (
                <p className="text-xs text-amber-700 mt-3 flex items-start gap-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mt-0.5" />
                  Tài khoản liên kết Google/GitHub không dùng mật khẩu – bạn có thể thêm mật khẩu trong mục "Quản lý tài khoản" nếu cần.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Nhật ký hoạt động chi tiết */}
        <section className="lg:col-span-3 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex items-center gap-3">
            <FontAwesomeIcon icon={faShieldHalved} />
            <span className="font-semibold">Nhật ký hoạt động</span>
          </div>
          <div className="p-6">
            {eventsLoading ? (
              <div className="text-sm text-gray-600">Đang tải…</div>
            ) : events.length === 0 ? (
              <div className="text-sm text-gray-600">Chưa có hoạt động.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Thời gian</th>
                      <th className="py-2 pr-4">Sự kiện</th>
                      <th className="py-2 pr-4">Chi tiết</th>
                      <th className="py-2 pr-4">Thiết bị</th>
                      <th className="py-2 pr-4">Provider</th>
                      <th className="py-2 pr-4">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map(ev => {
                      const d = toDate(ev.createdAt);
                      return (
                        <tr key={ev.id} className="border-t border-gray-100">
                          <td className="py-2 pr-4 whitespace-nowrap">{d ? `${relTime(d)} · ${d.toLocaleString('vi-VN')}` : '--'}</td>
                          <td className="py-2 pr-4 font-medium">{ev.type || 'activity'}</td>
                          <td className="py-2 pr-4">
                            {ev.note || ev.commentText || ev.postTitle || ev.postId || '--'}
                          </td>
                          <td className="py-2 pr-4">{ev.userAgent ? ev.userAgent.split(')')[0] + ')' : '--'}</td>
                          <td className="py-2 pr-4">{ev.provider || '--'}</td>
                          <td className="py-2 pr-4">{ev.ip || '--'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}