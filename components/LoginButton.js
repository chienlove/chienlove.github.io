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
  faUserCircle,
  faChevronDown,
  faMoon,
  faSun,
  faPlus,
  faEye,
  faEyeSlash,
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub, faXTwitter } from '@fortawesome/free-brands-svg-icons';

const ENFORCE_EMAIL_VERIFICATION = true; // gửi mail verify sau signup; KHÔNG chặn login

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

  const menuRef = useRef(null);
  const guestMenuRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  // Nghe sự kiện open-auth từ nơi khác (Comments.js…)
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

  const showToast = (type, text, ms = 2000) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const Toast = () => {
    if (!toast) return null;
    const tone =
      toast.type === 'success' ? 'bg-emerald-600' :
      toast.type === 'error'   ? 'bg-rose-600' :
      toast.type === 'info'    ? 'bg-sky-600' :
      toast.type === 'warning' ? 'bg-amber-600' :
                                 'bg-gray-800';
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center">
        <div className="absolute inset-0 bg-black/20" />
        <div className={`relative rounded-xl px-4 py-2 text-sm shadow-xl text-white ${tone}`}>
          {toast.text}
        </div>
      </div>
    );
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
      setHint('google');
      setMsg('Email này đã đăng ký bằng Google. Vui lòng đăng nhập Google để liên kết.');
      await loginGoogle(true);
      return;
    }
    if (methods.includes('password')) {
      setHint('password');
      setOpenAuth(true);
      setMode('login');
      setEmail(emailFromError);
      setMsg('Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập để liên kết.');
      return;
    }
    setMsg('Email đã tồn tại với nhà cung cấp khác. Hãy đăng nhập bằng nhà cung cấp cũ rồi thử lại.');
  };

  const doLinkIfNeeded = async () => {
    if (pendingCred && auth.currentUser) {
      await linkWithCredential(auth.currentUser, pendingCred);
      setPendingCred(null);
      setHint('');
      showToast('success', 'Đã liên kết tài khoản!');
      setOpenAuth(false);
    }
  };

  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      setOpenAuth(false);
      showToast('success', 'Đăng nhập Google thành công!');
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') await handleAccountExists(e, 'google');
      else setMsg(e.message);
    } finally { setLoading(false); }
  };

  const loginGithub = async () => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      setOpenAuth(false);
      showToast('success', 'Đăng nhập GitHub thành công!');
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') await handleAccountExists(e, 'github');
      else setMsg(e.message);
    } finally { setLoading(false); }
  };

  const loginTwitter = async () => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new TwitterAuthProvider());
      setOpenAuth(false);
      showToast('success', 'Đăng nhập X (Twitter) thành công!');
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') {
        await handleAccountExists(e, 'twitter');
      } else {
        setMsg(e.message);
      }
    } finally { setLoading(false); }
  };

  const pwdStrong = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(password);
  const pwdMatch  = password && confirmPwd && password === confirmPwd;

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') {
        if (!pwdStrong) { setMsg('Mật khẩu phải ≥8 ký tự và có chữ, số, ký tự đặc biệt.'); setLoading(false); return; }
        if (!pwdMatch)  { setMsg('Xác nhận mật khẩu không khớp.'); setLoading(false); return; }

        const { user: created } = await createUserWithEmailAndPassword(auth, email, password);
        if (ENFORCE_EMAIL_VERIFICATION) { try { await sendEmailVerification(created); } catch {} }
        showToast('success', 'Đăng ký thành công! Hãy kiểm tra email để xác minh.');
        setMode('login');
        setOpenAuth(false);
        setEmail(''); setPassword(''); setConfirmPwd('');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (pendingCred && hint === 'password') await doLinkIfNeeded();
        setOpenAuth(false);
        setEmail(''); setPassword('');
        showToast('success', 'Đăng nhập thành công!');
      }
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') { setMode('login'); setMsg('Email đã tồn tại. Vui lòng đăng nhập.'); }
      else setMsg(e.message);
    } finally { setLoading(false); }
  };

  const onReset = async () => {
    if (!email) return setMsg('Nhập email trước khi đặt lại mật khẩu.');
    try {
      const actionCodeSettings = { url: 'https://auth.storeios.net', handleCodeInApp: false };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      showToast('info', 'Đã gửi email đặt lại mật khẩu.');
    } catch (e) { setMsg(e.message); }
  };

  const logout = async () => {
    await auth.signOut();
    setMenuOpen(false);
    showToast('info', 'Bạn đã đăng xuất.');
  };

  // ==== Logged-in ====
  if (user) {
    const avatar = user.photoURL || null;
    return (
      <>
        <Toast />
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-1 pl-2 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="User menu"
            title={user.displayName || user.email}
          >
            {avatar ? (
              // ↓ Thu nhỏ avatar
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
              <a
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Hồ sơ
              </a>
              <a
                href="/my-comments"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Bình luận của tôi
              </a>
              {/* 🔔 Thông báo: mở panel, KHÔNG điều hướng (tránh 404) */}
              <button
                onClick={() => { setMenuOpen(false); window.dispatchEvent(new Event('open-notifications')); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Thông báo
              </button>
              <button
                onClick={() => { onToggleTheme(); setMenuOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
                <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4 h-4" />
                {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </>
    );
  }

  // ==== Logged-out ====
  return (
    <>
      <Toast />
      <div className="relative" ref={guestMenuRef}>
        <button
          onClick={(e) => {
            if (Date.now() - authClosedAt < 400) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setGuestMenuOpen(v => !v);
          }}
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          aria-label="Mở menu"
          title="Tài khoản"
        >
          <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
            <span>+</span>
          </span>
        </button>

        {guestMenuOpen && (
          <div className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
            <button
              onClick={() => { setOpenAuth(true); setGuestMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Đăng nhập / Đăng ký
            </button>
            <button
              onClick={() => { onToggleTheme(); setGuestMenuOpen(false); }}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
            >
              <FontAwesomeIcon icon={isDark ? faSun : faMoon} className="w-4 h-4" />
              {isDark ? 'Chế độ sáng' : 'Chế độ tối'}
            </button>
          </div>
        )}
      </div>

      {/* Auth Modal */}
      {openAuth && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpenAuth(false);
                  setAuthClosedAt(Date.now());
                }}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* Social */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => loginGoogle(false)} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  <FontAwesomeIcon icon={faGoogle} />
                  Google
                </button>
                <button onClick={loginGithub} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60">
                  <FontAwesomeIcon icon={faGithub} />
                  GitHub
                </button>
                <button onClick={loginTwitter} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-black text-white hover:opacity-90 disabled:opacity-60 col-span-1 sm:col-span-2">
                  <FontAwesomeIcon icon={faXTwitter} />
                  X (Twitter)
                </button>
              </div>

              <div className="my-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs uppercase tracking-wider text-gray-500">Hoặc email</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              <form onSubmit={onSubmitEmail} className="space-y-3">
                <input
                  type="email"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />

                {/* Password + show/hide */}
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 pr-10"
                    placeholder="Mật khẩu"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-600">
                    <FontAwesomeIcon icon={faEyeSlash} style={{ display: showPwd ? 'block' : 'none' }} />
                    <FontAwesomeIcon icon={faEye} style={{ display: showPwd ? 'none' : 'block' }} />
                  </button>
                </div>

                {/* Signup: confirm + strength */}
                {mode === 'signup' && (
                  <>
                    <div className="relative">
                      <input
                        type={showConfirm ? 'text' : 'password'}
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 pr-10"
                        placeholder="Xác nhận mật khẩu"
                        value={confirmPwd}
                        onChange={e => setConfirmPwd(e.target.value)}
                        required
                      />
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

                {msg && <div className="text-sm text-red-600">{msg}</div>}

                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading || (mode==='signup' && (!pwdStrong || !pwdMatch))}
                    className={`px-3 py-2 rounded-lg text-white ${mode==='signup' ? (pwdStrong && pwdMatch ? 'bg-gray-900 hover:opacity-90' : 'bg-gray-400 cursor-not-allowed') : 'bg-gray-900 hover:opacity-90'}`}
                  >
                    {mode === 'signup' ? 'Đăng ký' : 'Đăng nhập'}
                  </button>
                  <div className="flex items-center gap-4 text-sm">
                    <button type="button" onClick={() => setMode(m => m==='signup' ? 'login' : 'signup')}
                            className="underline">
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