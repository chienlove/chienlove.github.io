// components/NotificationsBell.js
import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function NotificationsBell({ onClick }){
  const [user,setUser]=useState(null);
  const [unread,setUnread]=useState(0);

  useEffect(()=>{ const unsub=auth.onAuthStateChanged(setUser); return ()=>unsub(); },[]);
  useEffect(()=>{
    if(!user) return;
    const q=query(collection(db,'notifications'), where('toUserId','==',user.uid), where('isRead','==',false));
    const unsub=onSnapshot(q,(snap)=>setUnread(snap.size));
    return ()=>unsub();
  },[user]);

  return (
    <button onClick={onClick} className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Notifications" title="Thông báo">
      <span className="material-icons text-gray-900 dark:text-gray-100">notifications</span>
      {unread>0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
          {unread>99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}