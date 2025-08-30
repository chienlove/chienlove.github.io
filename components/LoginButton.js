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

const ENFORCE_EMAIL_VERIFICATION = true; // không tự đăng nhập sau đăng ký

export default function LoginButton({ onToggleTheme, isDark }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);         // auth modal
  const [menuOpen, setMenuOpen] = useState(false); // user dropdown
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');       // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [toast, setToast] = useState(null);        // {type:'success'|'error'|'info', text:''}
  const [pendingCred, setPendingCred] = useState(null);
  const [hint, setHint] = useState('');
  const menuRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const showToast = (type, text, ms = 3200) => {
    setToast({ type, text });
    window.clearTimeout((showToast._t || 0));
    showToast._t = window.setTimeout(() => setToast(null), ms);
  };

  const handleAccountExists = async (error, provider) => {
    try {
      const emailFromError = error?.customData?.email;
      if (!emailFromError) return setMsg('Tài khoản đã tồn tại với nhà cung cấp khác.');
      const methods = await fetchSignInMethodsForEmail(auth, emailFromError);
      const cred =
        provider === 'github'
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
        setOpen(true);
        setMode('login');
        setEmail(emailFromError);
        setMsg('Email này đã đăng ký bằng mật khẩu. Hãy đăng nhập để liên kết.');
        return;
      }
      setMsg('Email đã tồn tại với nhà cung cấp khác. Hãy đăng nhập bằng nhà cung cấp cũ, rồi thử lại.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const doLinkIfNeeded = async () => {
    if (pendingCred && auth.currentUser) {
      await linkWithCredential(auth.currentUser, pendingCred);
      setPendingCred(null);
      setHint('');
      showToast('success', 'Đã liên kết tài khoản thành công!');
      setOpen(false);
    }
  };

  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      setOpen(false);
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
      setOpen(false);
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
        showToast('success', 'Đăng ký thành công! Vui lòng kiểm tra email để xác minh tài khoản.');
        setMode('login');
        setOpen(false);
        setEmail(''); setPassword('');
        if (ENFORCE_EMAIL_VERIFICATION) await auth.signOut();
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (pendingCred && hint === 'password') await doLinkIfNeeded();
        setOpen(false);
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
      await sendPasswordResetEmail(auth, email);
      showToast('info', 'Đã gửi email đặt lại mật khẩu.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const logout = async () => { await auth.signOut(); setMenuOpen(false); showToast('info', 'Bạn đã đăng xuất.'); };

  // -- UI: Toast --
  const Toast = () => toast ? (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[120] rounded-full px-4 py-2 text-sm shadow-lg border
      ${toast.type==='success' ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-200'
      : toast.type==='error' ? 'bg-red-50 border-red-300 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200'
      : 'bg-sky-50 border-sky-300 text-sky-800 dark:bg-sky-900/30 dark:border-sky-700 dark:text-sky-200'}`}>
      {toast.text}
    </div>
  ) : null;

  // -- UI: Logged-in (avatar + dropdown) --
  if (user) {
    const avatar = user.photoURL || '/avatar-default.svg';
    return (
      <>
        <Toast />
        <div className="relative" ref={menuRef}>
          <button
            className="flex items-center gap-2 pl-2 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="User menu"
            title={user.displayName || user.email}
          >
            <img src={avatar} alt="avatar" className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
            <svg className="w-4 h-4 opacity-70 hidden lg:block" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5 10 12.25 14.75 7.5h-9.5z"/></svg>
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
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-between"
              >
                Chế độ tối
                <span className="ml-3 inline-flex items-center justify-center w-9 h-5 rounded-full bg-gray-200 dark:bg-gray-700">
                  <span className={`w-4 h-4 bg-white rounded-full transform transition ${isDark ? 'translate-x-4' : 'translate-x-0'}`} />
                </span>
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700" />
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">Đăng xuất</button>
            </div>
          )}
        </div>
      </>
    );
  }

  // -- UI: Logged-out (icon-only) --
  return (
    <>
      <Toast />
      <button
        onClick={() => setOpen(true)}
        className="relative w-9 h-9 inline-flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
        aria-label="Đăng nhập / Đăng ký"
        title="Đăng nhập / Đăng ký"
      >
        {/* Icon user + plus (inline SVG để không phụ thuộc icon lib) */}
        <svg viewBox="0 0 24 24" className="w-5 h-5 opacity-90" fill="currentColor" aria-hidden>
          <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-4 0-8 2-8 6v1h12.5a5.5 5.5 0 0 1-.8-2.9c0-1.1.3-2.1.8-3.1-1.4-.8-3.1-1-4.5-1z"/>
        </svg>
        <span className="absolute -bottom-0 -right-0 w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">+</span>
      </button>

      {/* Auth Modal */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* Social */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => loginGoogle(false)} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  Google
                </button>
                <button onClick={loginGithub} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60">
                  GitHub
                </button>
              </div>

              <div className="my-4 flex items-center gap-4">
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                <span className="text-xs uppercase tracking-wider text-gray-500">Hoặc email</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>

              {/* Email form */}
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
                <div className="flex items-center justify-between">
                  <button type="submit" disabled={loading}
                          className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90">
                    {mode === 'signup' ? 'Đăng ký' : 'Đăng nhập'}
                  </button>
                  <div className="flex items-center gap-4 text-sm">
                    <button type="button" onClick={() => setMode(m => m === 'signup' ? 'login' : 'signup')} className="underline">
                      {mode === 'signup' ? 'Tôi đã có tài khoản' : 'Tạo tài khoản mới'}
                    </button>
                    <button type="button" onClick={onReset} className="underline">Quên mật khẩu</button>
                  </div>
                </div>
              </form>

              {msg && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{msg}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}