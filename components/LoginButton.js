// components/LoginButton.js
import { useEffect, useState, useRef } from 'react';
import { auth } from '../lib/firebase-client';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  TwitterAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  linkWithCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faChevronDown, faMoon, faSun, faPlus,
  faEye, faEyeSlash, faSpinner, faCircleCheck, faCircleXmark,
  faCircleInfo, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub, faXTwitter } from '@fortawesome/free-brands-svg-icons';

const ENFORCE_EMAIL_VERIFICATION = true;

export default function LoginButton({ onToggleTheme, isDark }) {
  const [user, setUser] = useState(null);
  const [openAuth, setOpenAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [guestMenuOpen, setGuestMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingCred, setPendingCred] = useState(null);
  const [hint, setHint] = useState('');
  const [authClosedAt, setAuthClosedAt] = useState(0);

  // 👇 Thông tin BAN để render banner
  const [banInfo, setBanInfo] = useState(null); // {mode: 'temporary'|'permanent', reason?, expiresAt?, remainingText?}

  const menuRef = useRef(null);
  const guestMenuRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onOpenAuth = () => {
      setGuestMenuOpen(false);
      setMenuOpen(false);
      setOpenAuth(true);
    };
    window.addEventListener('open-auth', onOpenAuth);
    return () => window.removeEventListener('open-auth', onOpenAuth);
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (guestMenuRef.current && !guestMenuRef.current.contains(e.target)) setGuestMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  /* ---------- Toast + Loading Overlay ---------- */
  const showToast = (type, text, ms = 2800) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };
  const Toast = () => {
    if (!toast) return null;
    const tone =
      toast.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' :
      toast.type === 'error'   ? 'border-rose-200 bg-rose-50 text-rose-800' :
      toast.type === 'info'    ? 'border-sky-200 bg-sky-50 text-sky-800' :
      toast.type === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' :
                                 'border-gray-200 bg-white text-gray-800';
    const Icon =
      toast.type === 'success' ? faCircleCheck :
      toast.type === 'error'   ? faCircleXmark :
      toast.type === 'warning' ? faTriangleExclamation :
                                 faCircleInfo;
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[140] px-4">
        <div className={`flex items-center gap-2 rounded-xl border px-4 py-2 shadow-xl ${tone}`}>
          <FontAwesomeIcon icon={Icon} className="shrink-0" />
          <div className="text-sm">{toast.text}</div>
        </div>
      </div>
    );
  };
  const LoadingOverlay = () => {
    if (!loading) return null;
    return (
      <div className="fixed inset-0 z-[130] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
        <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 px-5 py-4 shadow-2xl flex items-center gap-3">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl text-gray-700 dark:text-gray-200" />
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Đang xử lý…</div>
        </div>
      </div>
    );
  };

  /* ---------- Helpers ---------- */
  const formatRemaining = (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return '';
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d} ngày ${h} giờ`;
    if (h > 0) return `${h} giờ ${m} phút`;
    if (m > 0) return `${m} phút`;
    return `${s} giây`;
  };

  // lấy chi tiết BAN khi không có idToken (firebase chặn login -> user-disabled)
  const tryShowBanDetails = async (emailForLookup) => {
    if (!emailForLookup) return;
    try {
      const r = await fetch(`/api/auth/ban-info?email=${encodeURIComponent(emailForLookup)}`);
      const j = await r.json();
      if (!j || !j.banned) return;
      const isTemp = j.mode === 'temporary';
      let remainingText = '';
      if (isTemp && j.expiresAt) {
        const ms = new Date(j.expiresAt).getTime() - Date.now();
        const txt = formatRemaining(ms);
        if (txt) remainingText = txt;
      }
      setOpenAuth(true);
      setMode('login');
      setBanInfo({
        mode: isTemp ? 'temporary' : 'permanent',
        reason: j.reason || null,
        expiresAt: j.expiresAt || null,
        remainingText
      });
      showToast('error', isTemp ? 'Tài khoản đang bị BAN tạm thời.' : 'Tài khoản bị BAN vĩnh viễn.', 3600);
    } catch {}
  };

  const mapAuthError = (e) => {
    const code = e?.code || '';
    switch (code) {
      case 'auth/invalid-email':
        return 'Email không hợp lệ.';
      case 'auth/user-disabled':
        return 'Tài khoản đang bị BAN hoặc đã bị vô hiệu hoá.'; // chi tiết sẽ show qua tryShowBanDetails()
      case 'auth/user-not-found':
        return 'Không tìm thấy tài khoản với email này.';
      case 'auth/wrong-password':
        return 'Mật khẩu không đúng. Vui lòng thử lại.';
      case 'auth/too-many-requests':
        return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
      case 'auth/network-request-failed':
        return 'Lỗi mạng. Vui lòng kiểm tra kết nối internet.';
      case 'auth/popup-closed-by-user':
        return 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.';
      case 'auth/cancelled-popup-request':
        return 'Yêu cầu đăng nhập trước đó đã bị huỷ.';
      case 'auth/operation-not-allowed':
        return 'Phương thức đăng nhập này đang bị tắt.';
      case 'auth/credential-already-in-use':
        return 'Thông tin đăng nhập này đang được dùng cho tài khoản khác.';
      case 'auth/email-already-in-use':
        return 'Email đã được sử dụng. Vui lòng đăng nhập.';
      case 'auth/invalid-credential':
        return 'Thông tin đăng nhập không hợp lệ.';
      default:
        return e?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
    }
  };

  const handleAccountExists = async (error, provider) => {
    const emailFromError = error?.customData?.email;
    if (!emailFromError) return setMsg('Tài khoản đã tồn tại với nhà cung cấp khác.');
    const methods = await fetchSignInMethodsForEmail(auth, emailFromError);
    const cred =
      provider === 'github'  ? GithubAuthProvider.credentialFromError(error)  :
      provider === 'google'  ? GoogleAuthProvider.credentialFromError(error)  :
      provider === 'twitter' ? TwitterAuthProvider.credentialFromError(error) :
      null;
    setPendingCred(cred);

    if (methods.includes('google.com')) {
      setHint('google'); setMsg('Email này đã đăng ký bằng Google. Vui lòng đăng nhập Google để liên kết.');
      await loginGoogle(true); return;
    }
    if (methods.includes('password')) {
      setHint('password'); setOpenAuth(true); setMode('login'); setEmail(emailFromError);
      setMsg('Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập để liên kết.');
      return;
    }
    setMsg('Email đã tồn tại với nhà cung cấp khác. Hãy đăng nhập bằng nhà cung cấp cũ rồi thử lại.');
  };

  const doLinkIfNeeded = async () => {
    if (pendingCred && auth.currentUser) {
      await linkWithCredential(auth.currentUser, pendingCred);
      setPendingCred(null); setHint('');
      showToast('success', 'Đã liên kết tài khoản!');
      setOpenAuth(false);
    }
  };

  // Sau khi đăng nhập thành công -> hỏi guard (có idToken) để biết có bị ban không
  const runGuardAfterSignIn = async () => {
    try {
      if (!auth.currentUser) return true;
      const idToken = await auth.currentUser.getIdToken();
      const resp = await fetch('/api/auth/guard', { method: 'GET', headers: { Authorization: `Bearer ${idToken}` } });
      const json = await resp.json();
      if (json?.ok) return true;

      await auth.signOut().catch(()=>{});
      const isTemp = json?.mode === 'temporary';
      let remainingText = '';
      if (isTemp && json?.expiresAt) {
        const ms = new Date(json.expiresAt).getTime() - Date.now();
        const txt = formatRemaining(ms);
        if (txt) remainingText = txt;
      }
      setOpenAuth(true);
      setMode('login');
      setBanInfo({
        mode: isTemp ? 'temporary' : 'permanent',
        reason: json?.reason || null,
        expiresAt: json?.expiresAt || null,
        remainingText
      });
      setMsg('');
      showToast('error', isTemp ? 'Tài khoản đang bị BAN tạm thời.' : 'Tài khoản bị BAN vĩnh viễn.', 3600);
      return false;
    } catch {
      return true;
    }
  };

  /* ---------- Actions: Social ---------- */
  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg(''); setBanInfo(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập Google thành công!');
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') await handleAccountExists(e, 'google');
      else {
        setMsg(mapAuthError(e));
        if (e.code === 'auth/user-disabled') await tryShowBanDetails(e?.customData?.email);
      }
    } finally { setLoading(false); }
  };
  const loginGithub = async () => {
    setLoading(true); setMsg(''); setBanInfo(null);
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập GitHub thành công!');
    } catch (e) {
      setMsg(mapAuthError(e));
      if (e.code === 'auth/user-disabled') await tryShowBanDetails(e?.customData?.email);
    } finally { setLoading(false); }
  };
  const loginTwitter = async () => {
    setLoading(true); setMsg(''); setBanInfo(null);
    try {
      await signInWithPopup(auth, new TwitterAuthProvider());
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập X (Twitter) thành công!');
    } catch (e) {
      setMsg(mapAuthError(e));
      if (e.code === 'auth/user-disabled') await tryShowBanDetails(e?.customData?.email);
    } finally { setLoading(false); }
  };

  /* ---------- Actions: Email/Password ---------- */
  const pwdStrong = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  const pwdMatch = password && confirmPwd && password === confirmPwd;

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(''); setBanInfo(null);
    try {
      if (mode === 'signup') {
        if (!pwdStrong) { setMsg('Mật khẩu phải ≥8 ký tự và có chữ, số, ký tự đặc biệt.'); setLoading(false); return; }
        if (!pwdMatch) { setMsg('Xác nhận mật khẩu không khớp.'); setLoading(false); return; }
        const { user: created } = await createUserWithEmailAndPassword(auth, email, password);
        if (ENFORCE_EMAIL_VERIFICATION) { try { await sendEmailVerification(created); } catch {} }
        showToast('success', 'Đăng ký thành công! Hãy kiểm tra email để xác minh.', 3200);
        setMode('login'); setOpenAuth(false); setEmail(''); setPassword(''); setConfirmPwd('');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (!(await runGuardAfterSignIn())) return;
        if (pendingCred && hint === 'password') await doLinkIfNeeded();
        setOpenAuth(false); setEmail(''); setPassword('');
        showToast('success', 'Đăng nhập thành công!');
      }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        setMode('login'); setMsg('Email đã tồn tại. Vui lòng đăng nhập.');
      } else if (e.code === 'auth/invalid-credential') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (!methods || methods.length === 0) setMsg('Tài khoản chưa đăng ký hoặc email không tồn tại.');
          else setMsg('Mật khẩu không đúng. Vui lòng thử lại.');
        } catch { setMsg(mapAuthError(e)); }
      } else if (e.code === 'auth/user-disabled') {
        setMsg(mapAuthError(e));
        await tryShowBanDetails(email); // 👈 lấy reason + expiresAt để hiển thị banner
      } else {
        setMsg(mapAuthError(e));
      }
    } finally { setLoading(false); }
  };

  const onReset = async () => {
    if (!email) return setMsg('Nhập email trước khi đặt lại mật khẩu.');
    setLoading(true);
    try {
      const actionCodeSettings = { url: 'https://auth.storeios.net', handleCodeInApp: false };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      showToast('info', 'Đã gửi email đặt lại mật khẩu.');
    } catch (e) { setMsg(mapAuthError(e)); }
    finally { setLoading(false); }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await auth.signOut();
      setMenuOpen(false);
      showToast('info', 'Bạn đã đăng xuất.');
    } finally { setLoading(false); }
  };

  /* ---------- UI ---------- */
  const BanBanner = () => {
    if (!banInfo) return null;
    return (
      <div className="mb-4 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 p-3">
        <div className="font-semibold">
          {banInfo.mode === 'permanent'
            ? 'Tài khoản của bạn bị BAN vĩnh viễn.'
            : 'Tài khoản của bạn đang bị BAN tạm thời.'}
        </div>
        {banInfo.reason && <div className="text-sm mt-1"><b>Lý do:</b> {banInfo.reason}</div>}
        {banInfo.mode === 'temporary' && banInfo.remainingText && (
          <div className="text-sm mt-1"><b>Thời gian còn lại:</b> {banInfo.remainingText}</div>
        )}
      </div>
    );
  };

  // ---- Logged-in
  if (user) {
    const avatar = user.photoURL || null;
    return (
      <>
        <Toast />
        <LoadingOverlay />
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-1 pl-2 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="User menu"
            title={user.displayName || user.email}
          >
            {avatar ? (
              <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6" />
            )}
            <FontAwesomeIcon icon={faChevronDown} className="w-3.5 h-3.5 opacity-75" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
              <div className="px-4 py-3 text-sm">
                <div className="font-semibold">{user.displayName || 'Người dùng'}</div>
                <div className="text-gray-500 truncate">{user.email}</div>
              </div>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <a href="/profile" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Hồ sơ</a>
              <a href="/my-comments" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Bình luận của tôi</a>
              <button onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event('open-notifications')); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Thông báo</button>
              <button onClick={() => { onToggleTheme(); setMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4 h-4" />
                {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Đăng xuất</button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ---- Logged-out
  return (
    <>
      <Toast />
      <LoadingOverlay />
      <div className="relative" ref={guestMenuRef}>
        <button
          onClick={(e) => {
            if (Date.now() - authClosedAt < 400) { e.preventDefault(); e.stopPropagation(); return; }
            setGuestMenuOpen(v => !v);
          }}
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          aria-label="Mở menu"
          title="Tài khoản"
        >
          <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full"><span>+</span></span>
        </button>

        {guestMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <button onClick={() => { setOpenAuth(true); setGuestMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Đăng nhập / Đăng ký</button>
            <button onClick={() => { onToggleTheme(); setGuestMenuOpen(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2">
              <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4 h-4" />
              {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {openAuth && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</h3>
              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpenAuth(false); setAuthClosedAt(Date.now()); }} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* 🔴 BAN banner */}
              <BanBanner />

              {/* Social */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => loginGoogle(false)} disabled={loading} className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  <FontAwesomeIcon icon={faGoogle} /> Google
                </button>
                <button onClick={loginGithub} disabled={loading} className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60">
                  <FontAwesomeIcon icon={faGithub} /> GitHub
                </button>
                <button onClick={loginTwitter} disabled={loading} className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60 col-span-1 sm:col-span-2">
                  <FontAwesomeIcon icon={faXTwitter} /> X (Twitter)
                </button>
              </div>

              <div className="my-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs uppercase tracking-wider text-gray-500">Hoặc email</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              <form onSubmit={onSubmitEmail} className="space-y-3">
                <input type="email" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 pr-10" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-600">
                    <FontAwesomeIcon icon={faEyeSlash} style={{ display: showPwd ? 'block' : 'none' }} />
                    <FontAwesomeIcon icon={faEye} style={{ display: showPwd ? 'none' : 'block' }} />
                  </button>
                </div>

                {mode === 'signup' && (
                  <>
                    <div className="relative">
                      <input type={showConfirm ? 'text' : 'password'} className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 pr-10" placeholder="Xác nhận mật khẩu" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required />
                      <button type="button" onClick={() => setShowConfirm(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-600">
                        <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
                      </button>
                    </div>
                    <ul className="text-xs space-y-1 mt-1">
                      <li className={password.length >= 8 ? 'text-emerald-600' : 'text-gray-500'}>• Tối thiểu 8 ký tự</li>
                      <li className={/[A-Za-z]/.test(password) ? 'text-emerald-600' : 'text-gray-500'}>• Có chữ</li>
                      <li className={/\d/.test(password) ? 'text-emerald-600' : 'text-gray-500'}>• Có số</li>
                      <li className={/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : 'text-gray-500'}>• Có ký tự đặc biệt</li>
                      <li className={password && confirmPwd && password === confirmPwd ? 'text-emerald-600' : 'text-gray-500'}>• Xác nhận mật khẩu khớp</li>
                    </ul>
                  </>
                )}

                {msg && <div className="rounded-lg border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2 text-sm">{msg}</div>}

                <div className="flex items-center justify-between">
                  <button type="submit" disabled={loading || (mode==='signup' && (!pwdStrong || !pwdMatch))} className={`px-3 py-2 rounded-lg text-white ${mode==='signup' ? (pwdStrong && pwdMatch ? 'bg-gray-900 hover:opacity-90' : 'bg-gray-400 cursor-not-allowed') : 'bg-gray-900 hover:opacity-90'}`}>
                    {mode === 'signup' ? 'Đăng ký' : 'Đăng nhập'}
                  </button>
                  <div className="flex items-center gap-4 text-sm">
                    <button type="button" onClick={() => setMode(m => m==='signup' ? 'login' : 'signup')} className="underline">
                      {mode === 'signup' ? 'Tôi đã có tài khoản' : 'Tạo tài khoản mới'}
                    </button>
                    <button type="button" onClick={onReset} className="underline">Quên mật khẩu?</button>
                  </div>
                </div>
              </form>

              <div className="h-3" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}