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
  OAuthProvider
} from 'firebase/auth';

export default function LoginButton() {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);        // modal auth
  const [menuOpen, setMenuOpen] = useState(false);// user menu
  const [loading, setLoading] = useState(false);

  // email/password form
  const [mode, setMode] = useState('login');      // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  // lưu credential cần link sau khi đăng nhập đúng provider
  const [pendingCred, setPendingCred] = useState(null);
  const [hint, setHint] = useState(''); // gợi ý provider cần dùng để liên kết

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

  // ===== Helpers =====
  const handleAccountExists = async (error, providerName) => {
    // providerName: 'github' | 'google'
    try {
      const pending =
        providerName === 'github'
          ? GithubAuthProvider.credentialFromError(error)
          : GoogleAuthProvider.credentialFromError(error);

      const emailFromError = error.customData?.email;
      if (!emailFromError || !pending) {
        setMsg('Tài khoản đã tồn tại với nhà cung cấp khác.');
        return;
      }

      // hỏi Firebase xem email này đã đăng ký bằng phương thức nào
      const methods = await fetchSignInMethodsForEmail(auth, emailFromError);

      // nếu là Google
      if (methods.includes('google.com')) {
        setPendingCred(pending);
        setHint('google');
        setOpen(true);
        setMsg('Email này đã đăng ký bằng Google. Vui lòng đăng nhập Google để liên kết tài khoản.');
        // Đăng nhập Google ngay:
        await loginGoogle(true); // true = isLinking
        return;
      }

      // nếu là email/password
      if (methods.includes('password')) {
        // mở form email/password để đăng nhập rồi link
        setPendingCred(pending);
        setHint('password');
        setOpen(true);
        setMode('login');
        setEmail(emailFromError);
        setMsg('Email này đã đăng ký bằng mật khẩu. Vui lòng đăng nhập để liên kết nhà cung cấp mới.');
        return;
      }

      // các provider khác (ít gặp)
      setMsg('Email đã tồn tại với một nhà cung cấp khác. Hãy đăng nhập bằng nhà cung cấp cũ, sau đó thử lại.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const doLinkIfNeeded = async () => {
    if (pendingCred && auth.currentUser) {
      try {
        await linkWithCredential(auth.currentUser, pendingCred);
        setPendingCred(null);
        setHint('');
        setMsg('Đã liên kết tài khoản thành công!');
        setOpen(false);
      } catch (e) {
        setMsg(e.message);
      }
    }
  };

  // ===== Providers =====
  const loginGoogle = async (isLinking = false) => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      if (isLinking) await doLinkIfNeeded();
      setOpen(false);
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') {
        await handleAccountExists(e, 'google');
      } else {
        setMsg(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const loginGithub = async () => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      setOpen(false);
    } catch (e) {
      if (e.code === 'auth/account-exists-with-different-credential') {
        await handleAccountExists(e, 'github');
      } else {
        setMsg(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== Email/Password =====
  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        if (pendingCred && hint === 'password') await doLinkIfNeeded();
      }
      setOpen(false);
      setEmail(''); setPassword('');
    } catch (e) {
      // nếu người dùng cố "đăng ký" nhưng email đã có → chuyển sang login
      if (e.code === 'auth/email-already-in-use') {
        setMode('login');
        setMsg('Email đã tồn tại. Vui lòng đăng nhập.');
      } else {
        setMsg(e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!email) return setMsg('Nhập email trước khi đặt lại mật khẩu.');
    try {
      await sendPasswordResetEmail(auth, email);
      setMsg('Đã gửi email đặt lại mật khẩu.');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const logout = async () => {
    await auth.signOut();
    setMenuOpen(false);
  };

  // ===== UI đã đăng nhập =====
  if (user) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          onClick={() => setMenuOpen(v => !v)}
        >
          <img src={user.photoURL || '/avatar.png'} alt="avatar" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          <span className="hidden sm:block text-sm max-w-[140px] truncate">{user.displayName || user.email}</span>
          <svg className="w-4 h-4 opacity-70" viewBox="0 0 20 20" fill="currentColor"><path d="M5.25 7.5 10 12.25 14.75 7.5h-9.5z"/></svg>
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-2 w-60 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl p-2">
            <div className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="font-medium text-gray-900 dark:text-white">{user.displayName || 'Người dùng'}</div>
              <div className="truncate">{user.email}</div>
            </div>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <a href="/profile" className="block px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800">Hồ sơ</a>
            <a href="/my-comments" className="block px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800">Bình luận của tôi</a>
            <a href="/notifications" className="block px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800">Thông báo</a>
            <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
            <button onClick={logout} className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800">Đăng xuất</button>
          </div>
        )}
      </div>
    );
  }

  // ===== UI chưa đăng nhập =====
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1 text-sm rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90"
      >
        Đăng nhập / Đăng ký
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold">Chào mừng đến StoreiOS</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </button>
            </div>

            <div className="px-5 pt-5 pb-2">
              {/* Social buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button onClick={() => loginGoogle(false)} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.5 32.4 29.1 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.7 3l5.7-5.7C33.5 6.1 28.9 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-9 20-20c0-1.1-.1-2.2-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.7 1.1 7.7 3l5.7-5.7C33.5 6.1 28.9 4 24 4 16 4 8.9 8.4 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5 0 9.5-1.9 12.9-4.9l-6-4.9C29.1 36 26.7 37 24 37c-5.1 0-9.4-3.4-11-8.1l-6.6 5C8.9 39.6 15.9 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.3 3.9-5 6.7-9.3 6.7-5.1 0-9.4-3.4-11-8.1l-6.6 5C8.9 39.6 15.9 44 24 44c11.1 0 20-9 20-20 0-1.1-.1-2.2-.4-3.5z"/></svg>
                  Google
                </button>
                <button onClick={loginGithub} disabled={loading}
                        className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60">
                  {/* GitHub icon */}<svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 00-3.8 23.4c.6.1.9-.3.9-.6v-2.2c-3.8.8-4.6-1.8-4.6-1.8-.6-1.6-1.5-2-1.5-2-1.2-.8.1-.8.1-.8 1.3.1 2 .9 2 .9 1.2 2 3.1 1.4 3.8 1 .1-.9.5-1.4.8-1.7-3-.3-6.2-1.5-6.2-6.7 0-1.5.5-2.7 1.3-3.6-.1-.3-.6-1.8.1-3.7 0 0 1.2-.4 3.8 1.3a13 13 0 016.9 0c2.6-1.7 3.8-1.3 3.8-1.3.7 1.9.2 3.4.1 3.7.8.9 1.3 2.1 1.3 3.6 0 5.2-3.2 6.4-6.2 6.7.5.4.9 1.2.9 2.4v3.6c0 .3.3.7.9.6A12 12 0 0012 .5z"/></svg>
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
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  placeholder="Email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
                <input
                  type="password"
                  className="w-full rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2"
                  placeholder="Mật khẩu"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                />
                <div className="flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-2 rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 disabled:opacity-60"
                  >
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