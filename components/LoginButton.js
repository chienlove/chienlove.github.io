import { useEffect, useState, useRef } from 'react';
import { auth } from '../lib/firebase-client';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  linkWithCredential,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';

export default function LoginButton({ onToggleTheme, isDark }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);        // auth modal
  const [menuOpen, setMenuOpen] = useState(false);// profile dropdown
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login');      // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
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

  const handleAccountExists = async (error, provider) => {
    const emailFromError = error.customData?.email;
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
    } else if (methods.includes('password')) {
      setHint('password');
      setOpen(true);
      setMode('login');
      setEmail(emailFromError);
      setMsg('Email này đã đăng ký mật khẩu. Hãy đăng nhập để liên kết.');
    } else {
      setMsg('Email đã tồn tại với nhà cung cấp khác. Hãy đăng nhập bằng nhà cung cấp cũ rồi thử lại.');
    }
  };

  const doLinkIfNeeded = async () => {
    if (pendingCred && auth.currentUser) {
      await linkWithCredential(auth.currentUser, pendingCred);
      setPendingCred(null);
      setHint('');
      setMsg('Đã liên kết tài khoản!');
      setOpen(false);
    }
  };

  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      setOpen(false);
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
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') await handleAccountExists(e, 'github');
      else setMsg(e.message);
    } finally { setLoading(false); }
  };

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') await createUserWithEmailAndPassword(auth, email, password);
      else {
        await signInWithEmailAndPassword(auth, email, password);
        if (pendingCred && hint === 'password') await doLinkIfNeeded();
      }
      setOpen(false); setEmail(''); setPassword('');
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') { setMode('login'); setMsg('Email đã tồn tại. Vui lòng đăng nhập.'); }
      else setMsg(e.message);
    } finally { setLoading(false); }
  };

  const onReset = async () => {
    if (!email) return setMsg('Nhập email trước khi đặt lại mật khẩu.');
    await sendPasswordResetEmail(auth, email);
    setMsg('Đã gửi email đặt lại mật khẩu.');
  };

  const logout = async () => { await auth.signOut(); setMenuOpen(false); };

  // Logged-in UI
  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="User menu"
        >
          <img
            src={user.photoURL || '/avatar.png'}
            alt="avatar"
            className="w-8 h-8 rounded-full"
            referrerPolicy="no-referrer"
          />
          <span className="hidden lg:block text-sm max-w-[160px] truncate">{user.displayName || user.email}</span>
          <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5 10 12.25 14.75 7.5h-9.5z"/></svg>
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
    );
  }

  // Logged-out UI
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 text-sm rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
      >
        Đăng nhập / Đăng ký
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Chào mừng đến StoreiOS</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
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

              <form onSubmit={onSubmitEmail} className="space-y-3">
                <input type="email" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                       placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                <input type="password" className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                       placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required />
                <div className="flex items-center justify-between">
                  <button type="submit" className="px-3 py-2 rounded-lg bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90">
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