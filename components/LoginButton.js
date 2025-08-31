// components/LoginButton.js
import { useEffect, useState, useRef } from 'react';
import { auth } from '../lib/firebase-client';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
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
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';

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
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [pendingCred, setPendingCred] = useState(null);
  const [hint, setHint] = useState('');
  const menuRef = useRef(null);
  const guestMenuRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
      if (guestMenuRef.current && !guestMenuRef.current.contains(e.target)) setGuestMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const showToast = (type, text, ms = 3000) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const handleAccountExists = async (error, provider) => {
    const emailFromError = error?.customData?.email;
    if (!emailFromError) return setMsg('Tài khoản đã tồn tại với nhà cung cấp khác.');
    const methods = await fetchSignInMethodsForEmail(auth, emailFromError);
    const cred = provider === 'github'
      ? GithubAuthProvider.credentialFromError(error)
      : GoogleAuthProvider.credentialFromError(error);
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

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') {
        const { user: created } = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(created);
        showToast('success', 'Đăng ký thành công! Hãy kiểm tra email để xác minh tài khoản.');
        setMode('login');
        setOpenAuth(false);
        setEmail(''); setPassword('');
        if (ENFORCE_EMAIL_VERIFICATION) await auth.signOut();
      } else {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const u = cred.user || auth.currentUser;
        // 🔐 Chặn dùng tài khoản chưa xác minh để tương tác
        if (ENFORCE_EMAIL_VERIFICATION && u && !u.emailVerified) {
          try { await sendEmailVerification(u); } catch {}
          showToast('info', 'Tài khoản chưa xác minh. Đã gửi lại email xác minh.');
          await auth.signOut();
          setLoading(false);
          return;
        }
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
    } catch (e) {
      setMsg(e.message);
    }
  };

  const logout = async () => {
    await auth.signOut();
    setMenuOpen(false);
    showToast('info', 'Bạn đã đăng xuất.');
  };

  const Toast = () => toast ? (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100">
      {toast.text}
    </div>
  ) : null;

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
              <img src={avatar} alt="avatar" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
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
              <a href="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Hồ sơ</a>
              <a href="/my-comments" className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Bình luận của tôi</a>
              <a href="/notifications" className="block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Thông báo</a>
              <button
                onClick={onToggleTheme}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2"
              >
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

  // ==== Logged-out ====
  return (
    <>
      <Toast />
      <div className="relative" ref={guestMenuRef}>
        <button
          onClick={() => setGuestMenuOpen(v => !v)}
          className="relative w-9 h-9 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          aria-label="Mở menu"
          title="Tài khoản"
        >
          <FontAwesomeIcon icon={faUserCircle} className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full">
            <FontAwesomeIcon icon={faPlus} className="w-2 h-2" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</h3>
              <button onClick={() => setOpenAuth(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* Social + icons */}
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
                <input
                  type="password"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />

                {msg && <div className="text-sm text-red-600">{msg}</div>}

                <div className="flex items-center justify-between">
                  <button type="submit" disabled={loading}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg.white dark:text-gray-900 hover:opacity-90">
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