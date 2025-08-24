import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase-client';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

export default function LoginButton() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setUser);
    return () => unsub();
  }, []);

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
          onClick={() => signOut(auth)}
          className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
        >
          Đăng xuất
        </button>
      </div>
    );
  }

  const onLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <button
      onClick={onLogin}
      className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
    >
      Đăng nhập
    </button>
  );
}