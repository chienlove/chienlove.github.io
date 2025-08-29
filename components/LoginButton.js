import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase-client';
import {
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';

export default function LoginButton() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

  const loginGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } finally {
      setLoading(false);
    }
  };

  const loginFacebook = async () => {
    setLoading(true);
    try {
      const provider = new FacebookAuthProvider();
      await signInWithPopup(auth, provider);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => signOut(auth);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <img
          src={user.photoURL || '/avatar.png'}
          alt="avatar"
          className="w-8 h-8 rounded-full"
          referrerPolicy="no-referrer"
        />
        <span className="text-sm">{user.displayName || user.email}</span>
        <button
          onClick={logout}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={loginGoogle}
        disabled={loading}
        className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
      >
        Google
      </button>
      <button
        onClick={loginFacebook}
        disabled={loading}
        className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
      >
        Facebook
      </button>
    </div>
  );
}