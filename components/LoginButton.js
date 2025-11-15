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
  faUserCircle, faMoon, faSun, faEye, faEyeSlash, faSpinner,
  faCircleCheck, faCircleXmark, faCircleInfo, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faXTwitter } from '@fortawesome/free-brands-svg-icons';

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
  const [rememberMe, setRememberMe] = useState(true);

  const [banInfo, setBanInfo] = useState(null);

  const menuRef = useRef(null);
  const guestMenuRef = useRef(null);
  const modalRef = useRef(null);

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

  /* ================= Toast + Loading Overlay ================= */

  // FIX: Clear timeout properly to prevent memory leak
  const showToast = (type, text, ms = 2800) => {
    // Clear previous timeout
    if (showToast._t) window.clearTimeout(showToast._t);
    
    setToast({ type, text });
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
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[2100] px-4">
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
      <div className="fixed inset-0 z-[2050] bg-black/30 backdrop-blur-[1px] flex items-center justify-center">
        <div className="rounded-2xl bg-white/90 dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-800 px-5 py-4 shadow-2xl flex items-center gap-3">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xl text-gray-700 dark:text-gray-200" />
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Đang xử lý…</div>
        </div>
      </div>
    );
  };

  /* ================= Helpers ================= */

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

  const fetchBanDetails = async (emailForLookup) => {
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
      case 'auth/invalid-email': return 'Email không hợp lệ.';
      case 'auth/user-disabled': return '';
      case 'auth/user-not-found': return 'Không tìm thấy tài khoản với email này.';
      case 'auth/wrong-password': return 'Mật khẩu không đúng. Vui lòng thử lại.';
      case 'auth/too-many-requests': return 'Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.';
      case 'auth/network-request-failed': return 'Lỗi mạng. Vui lòng kiểm tra kết nối internet.';
      case 'auth/popup-closed-by-user': return 'Bạn đã đóng cửa sổ đăng nhập trước khi hoàn tất.';
      case 'auth/cancelled-popup-request': return 'Yêu cầu đăng nhập trước đó đã bị huỷ.';
      case 'auth/operation-not-allowed': return 'Phương thức đăng nhập này đang bị tắt.';
      case 'auth/credential-already-in-use': return 'Thông tin đăng nhập này đang được dùng cho tài khoản khác.';
      case 'auth/email-already-in-use': return 'Email đã được sử dụng. Vui lòng đăng nhập.';
      case 'auth/invalid-credential': return 'Thông tin đăng nhập không hợp lệ.';
      default: return e?.message || 'Có lỗi xảy ra. Vui lòng thử lại.';
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

  // FIX: Add timeout to prevent API hang
  const runGuardAfterSignIn = async () => {
    try {
      if (!auth.currentUser) return true;
      
      const idToken = await auth.currentUser.getIdToken();
      
      // Add 3 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const resp = await fetch('/api/auth/guard', {
        method: 'GET',
        headers: { Authorization: `Bearer ${idToken}` },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const json = await resp.json();
      
      if (json?.ok) return true;

      // Bị ban → signOut + hiển thị banner chi tiết
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
        remainingText,
      });
      setMsg('');
      showToast('error', isTemp ? 'Tài khoản đang bị BAN tạm thời.' : 'Tài khoản bị BAN vĩnh viễn.', 3600);
      return false;
    } catch {
      // Guard error should not block login
      return true;
    }
  };

  /* ================= Actions: Social ================= */

  // FIX: Show toast immediately when login starts
  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg(''); setBanInfo(null);
    showToast('info', 'Đang đăng nhập Google...', 2000); // ➕ Immediate feedback
    
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập Google thành công!');
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') {
        await handleAccountExists(e, 'google');
      } else if (e.code === 'auth/user-disabled') {
        setMsg('');
        await fetchBanDetails(e?.customData?.email);
      } else {
        setMsg(mapAuthError(e));
      }
    } finally { 
      setLoading(false); 
    }
  };

  const loginGithub = async () => {
    setLoading(true); setMsg(''); setBanInfo(null);
    showToast('info', 'Đang đăng nhập GitHub...', 2000); // ➕ Immediate feedback
    
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập GitHub thành công!');
    } catch (e) {
      if (e.code === 'auth/user-disabled') {
        setMsg(''); await fetchBanDetails(e?.customData?.email);
      } else {
        setMsg(mapAuthError(e));
      }
    } finally { 
      setLoading(false); 
    }
  };

  const loginTwitter = async () => {
    setLoading(true); setMsg(''); setBanInfo(null);
    showToast('info', 'Đang đăng nhập X (Twitter)...', 2000); // ➕ Immediate feedback
    
    try {
      await signInWithPopup(auth, new TwitterAuthProvider());
      if (!(await runGuardAfterSignIn())) return;
      setOpenAuth(false);
      showToast('success', 'Đăng nhập X (Twitter) thành công!');
    } catch (e) {
      if (e.code === 'auth/user-disabled') {
        setMsg(''); await fetchBanDetails(e?.customData?.email);
      } else {
        setMsg(mapAuthError(e));
      }
    } finally { 
      setLoading(false); 
    }
  };

  /* ================= Actions: Email/Password ================= */

  const pwdStrong = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  const pwdMatch  = password && confirmPwd && password === confirmPwd;

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg(''); setBanInfo(null);
    showToast('info', mode === 'signup' ? 'Đang đăng ký...' : 'Đang đăng nhập...', 2000); // ➕ Immediate feedback
    
    try {
      if (mode === 'signup') {
        if (!pwdStrong) { setMsg('Mật khẩu phải ≥8 ký tự và có chữ, số, ký tự đặc biệt.'); setLoading(false); return; }
        if (!pwdMatch)  { setMsg('Xác nhận mật khẩu không khớp.'); setLoading(false); return; }
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
    } catch (e2) {
      if (e2.code === 'auth/email-already-in-use') {
        setMode('login'); setMsg('Email đã tồn tại. Vui lòng đăng nhập.');
      } else if (e2.code === 'auth/invalid-credential') {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email);
          if (!methods || methods.length === 0) setMsg('Tài khoản chưa đăng ký hoặc email không tồn tại.');
          else setMsg('Mật khẩu không đúng. Vui lòng thử lại.');
        } catch { setMsg(mapAuthError(e2)); }
      } else if (e2.code === 'auth/user-disabled') {
        setMsg(''); await fetchBanDetails(email);
      } else {
        setMsg(mapAuthError(e2));
      }
    } finally { 
      setLoading(false); 
    }
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

  /* ================= Modal Behaviors ================= */

  useEffect(() => {
    if (!openAuth) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') setOpenAuth(false); };
    window.addEventListener('keydown', onKey);
    setTimeout(() => { try { modalRef.current?.focus(); } catch {} }, 0);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [openAuth]);

  useEffect(() => {
    if (!openAuth) return;
    const onResize = () => {
      if (modalRef.current) {
        modalRef.current.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => { if (modalRef.current) modalRef.current.style.transform = ''; });
      }
    };
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('orientationchange', onResize);
      window.removeEventListener('resize', onResize);
    };
  }, [openAuth]);

  /* ================= UI Pieces ================= */

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

  /* ================= RENDER ================= */

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
            {avatar
              ? <img src={avatar} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
              : <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6" />}
            <svg className="w-3.5 h-3.5 opacity-75" viewBox="0 0 20 20"><path d="M7 8l3 3 3-3" fill="currentColor"/></svg>
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

      {openAuth && (
        <div
          className="fixed inset-0 z-[2000] bg-black/55 flex items-center justify-center"
          style={{
            minHeight: '100dvh',
            paddingTop: 'max(env(safe-area-inset-top), 10px)',
            paddingBottom: 'max(env(safe-area-inset-bottom), 10px)',
            paddingLeft: 16, paddingRight: 16,
          }}
          aria-modal="true"
          role="dialog"
          onClick={() => setOpenAuth(false)}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[700px] mx-1.5 sm:mx-4 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl focus:outline-none overflow-hidden"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="sticky top-0 z-10 flex justify-end px-4 pt-4 pb-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur">
              <button
                aria-label="Đóng"
                className="w-9 h-9 inline-flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => { setOpenAuth(false); setAuthClosedAt(Date.now()); }}
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div
              className="overflow-y-auto overscroll-contain px-11 sm:px-20 pt-0 pb-1"
              style={{
                maxHeight: '68vh',
                WebkitOverflowScrolling: 'touch',
                paddingBottom: 'max(env(safe-area-inset-bottom), 18px)',
                paddingTop: 'max(env(safe-area-inset-top), 4px)',
              }}
            >
              <div className="text-center mb-4">
                <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight tracking-tight bg-gradient-to-br from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                  Chào mừng<br className="sm:hidden" /> trở lại!
                </h1>
                <p className="mt-3 text-base sm:text-lg text-gray-500 dark:text-gray-400">
                  Đăng nhập để tiếp tục
                </p>
              </div>

              <BanBanner />

              <div className="mb-4">
                <label className="block text-[15px] font-semibold text-gray-800 dark:text-gray-200 mb-2">Email</label>
                <input
                  type="email"
                  className="w-full h-12 sm:h-[54px] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 text-[15px] placeholder-gray-400"
                  placeholder="example@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="block text-[15px] font-semibold text-gray-800 dark:text-gray-200 mb-2">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="w-full h-12 sm:h-[54px] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 pr-11 text-[15px] placeholder-gray-400"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-600"
                    aria-label={showPwd ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    <FontAwesomeIcon icon={showPwd ? faEyeSlash : faEye} />
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="mb-4">
                  <label className="block text-[15px] font-semibold text-gray-800 dark:text-gray-200 mb-2">Xác nhận mật khẩu</label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      className="w-full h-12 sm:h-[54px] rounded-2xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 pr-11 text-[15px] placeholder-gray-400"
                      placeholder="Nhập lại mật khẩu"
                      value={confirmPwd}
                      onChange={e => setConfirmPwd(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-600"
                      aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      <FontAwesomeIcon icon={showConfirm ? faEyeSlash : faEye} />
                    </button>
                  </div>

                  <ul className="text-xs space-y-1 mt-2">
                    <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-emerald-600' : 'text-gray-500'}`}>
                      <FontAwesomeIcon icon={password.length >= 8 ? faCircleCheck : faCircleXmark} className="w-3.5 h-3.5" />
                      Tối thiểu 8 ký tự
                    </li>
                    <li className={`flex items-center gap-2 ${/[A-Za-z]/.test(password) ? 'text-emerald-600' : 'text-gray-500'}`}>
                      <FontAwesomeIcon icon={/[A-Za-z]/.test(password) ? faCircleCheck : faCircleXmark} className="w-3.5 h-3.5" />
                      Có chữ
                    </li>
                    <li className={`flex items-center gap-2 ${/\d/.test(password) ? 'text-emerald-600' : 'text-gray-500'}`}>
                      <FontAwesomeIcon icon={/\d/.test(password) ? faCircleCheck : faCircleXmark} className="w-3.5 h-3.5" />
                      Có số
                    </li>
                    <li className={`flex items-center gap-2 ${/[^A-Za-z0-9]/.test(password) ? 'text-emerald-600' : 'text-gray-500'}`}>
                      <FontAwesomeIcon icon={/[^A-Za-z0-9]/.test(password) ? faCircleCheck : faCircleXmark} className="w-3.5 h-3.5" />
                      Có ký tự đặc biệt
                    </li>
                    <li className={`flex items-center gap-2 ${(password && confirmPwd && password === confirmPwd) ? 'text-emerald-600' : 'text-gray-500'}`}>
                      <FontAwesomeIcon icon={(password && confirmPwd && password === confirmPwd) ? faCircleCheck : faCircleXmark} className="w-3.5 h-3.5" />
                      Xác nhận mật khẩu khớp
                    </li>
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between text-[15px] mb-5">
                <label className="inline-flex items-center gap-2 select-none">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded border-gray-300"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                <span className="text-gray-800 dark:text-gray-200 font-semibold">Ghi nhớ</span>
                </label>
                <button type="button" onClick={onReset} className="font-bold text-[15px] text-emerald-700 hover:underline">
                  Quên mật khẩu?
                </button>
              </div>

              {msg && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 text-rose-800 px-4 py-3 text-[14px]">
                  {msg}
                </div>
              )}

              <form onSubmit={onSubmitEmail}>
                <button
                  type="submit"
                  disabled={loading || (mode==='signup' && (!pwdStrong || !(password && confirmPwd && password === confirmPwd)))}
                  className="w-full h-[56px] rounded-full text-white text-[17px] font-extrabold tracking-wide
                             bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500
                             disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg"
                >
                  {mode === 'signup' ? 'Đăng ký' : 'Đăng nhập'}
                </button>
              </form>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-gray-500 dark:text-gray-400 text-[15px]">Hoặc đăng nhập với</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              <div className="flex items-center justify-center gap-4 sm:gap-5">
                <button
                  onClick={() => loginGoogle(false)} disabled={loading}
                  className="w-[52px] h-[52px] rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm hover:shadow flex items-center justify-center"
                  title="Google" aria-label="Đăng nhập với Google"
                >
                  <svg width="22" height="22" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.9 0-12.5-5.6-12.5-12.5S17.1 11 24 11c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 5.7 29.6 4 24 4 12.3 4 3 13.3 3 25s9.3 21 21 21 21-9.3 21-21c0-1.5-.2-3-.4-4.5z"/>
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.3 16.3 18.8 13 24 13c3.2 0 6.1 1.2 8.3 3.2l5.7-5.7C34.6 5.7 29.6 4 24 4 15.5 4 8.3 8.7 6.3 14.7z"/>
                    <path fill="#4CAF50" d="M24 46c5.3 0 10.3-2 13.9-5.3l-6.4-5.2C29.4 37.4 26.9 38.5 24 38.5c-5.2 0-9.6-3.3-11.2-7.9l-6.5 5C8.3 41.3 15.5 46 24 46z"/>
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.9-3.1 5.3-5.8 6.8l.1.1 6.4 5.2c-.5.5 8-5.8 8-16.1 0-1.5-.2-3-.4-4.5z"/>
                  </svg>
                </button>

                <button
                  onClick={loginGithub} disabled={loading}
                  className="w-[52px] h-[52px] rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm hover:shadow flex items-center justify-center"
                  title="GitHub" aria-label="Đăng nhập với GitHub"
                >
                  <FontAwesomeIcon icon={faGithub} className="text-[20px]" />
                </button>

                <button
                  onClick={loginTwitter} disabled={loading}
                  className="w-[52px] h-[52px] rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-sm hover:shadow flex items-center justify-center"
                  title="X (Twitter)" aria-label="Đăng nhập với X"
                >
                  <FontAwesomeIcon icon={faXTwitter} className="text-[18px]" />
                </button>
              </div>

              <div className="mt-8 text-center text-[15px]">
                <span className="text-gray-600 dark:text-gray-400">
                  {mode === 'signup' ? 'Đã có tài khoản? ' : 'Chưa có tài khoản? '}
                </span>
                <button
                  type="button"
                  className="font-extrabold text-emerald-700 hover:underline"
                  onClick={() => setMode(m => m==='signup' ? 'login' : 'signup')}
                >
                  {mode === 'signup' ? 'Đăng nhập' : 'Đăng ký ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
