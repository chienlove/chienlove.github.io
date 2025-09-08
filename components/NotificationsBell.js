import { useEffect, useState } from 'react';
import { auth, db } from '../lib/firebase-client';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';

export default function NotificationsBell({ onClick }){
  const [user,setUser]=useState(null);
  const [unreadQ,setUnreadQ]=useState(0); // từ notifications query
  const [unreadC,setUnreadC]=useState(0); // từ user_counters fallback

  useEffect(()=>{ const unsub=auth.onAuthStateChanged(setUser); return ()=>unsub(); },[]);

  // Nguồn 1: notifications where toUserId & isRead==false
  useEffect(()=>{
    if(!user) return;
    let unsub=()=>{};
    try{
      const q=query(collection(db,'notifications'), where('toUserId','==',user.uid), where('isRead','==',false));
      unsub=onSnapshot(q,(snap)=>setUnreadQ(snap.size), ()=>setUnreadQ(0));
    }catch{ setUnreadQ(0); }
    return ()=>unsub();
  },[user]);

  // Nguồn 2: user_counters/{uid}.unreadCount (fallback nếu nguồn 1 lỗi index)
  useEffect(()=>{
    if(!user) return;
    const ref=doc(db,'user_counters',user.uid);
    const unsub=onSnapshot(ref,(snap)=>{ const n=snap.exists()?(snap.data().unreadCount||0):0; setUnreadC(n); }, ()=>setUnreadC(0));
    return ()=>unsub();
  },[user]);

  const unread=Math.max(unreadQ, unreadC);

  const handleClick=()=>{
    if(onClick) onClick();
    // phát event để mở/đóng panel nếu component cha không truyền prop
    try{ window.dispatchEvent(new CustomEvent('notifications:toggle')); }catch{}
  };

  return (
    <button onClick={handleClick} className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Notifications" title="Thông báo">
      <span className="material-icons text-gray-900 dark:text-gray-100">notifications</span>
      {unread>0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
          {unread>99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}