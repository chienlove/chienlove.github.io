// components/NotificationsPanel.js
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { auth, db } from '../lib/firebase-client';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc, where, writeBatch, runTransaction } from 'firebase/firestore';
import Link from 'next/link';

function formatDate(ts){ try{ let d=null; if(!ts) return null; if(ts.seconds) d=new Date(ts.seconds*1000); else if(typeof ts==='number'||typeof ts==='string') d=new Date(ts); else if(ts instanceof Date) d=ts; if(!d) return null; const rel=new Intl.RelativeTimeFormat('vi',{numeric:'auto'}); const diff=(Date.now()-d.getTime())/1000; const units=[['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]]; for(const [u,s] of units){ if(Math.abs(diff)>=s||u==='second'){ const val=Math.round(diff/s*-1); return {rel: rel.format(val,u), abs: d.toLocaleString('vi-VN')}; } } return {rel:'',abs:d.toLocaleString('vi-VN')}; }catch{ return null; } }

export default function NotificationsPanel({ open, onClose }){
  const router = useRouter();
  const [user,setUser]=useState(null);
  const [items,setItems]=useState([]);

  useEffect(()=>{ const unsub=auth.onAuthStateChanged(setUser); return ()=>unsub(); },[]);

  useEffect(()=>{
    if(!user||!open) return;
    // Ưu tiên sortAt; nếu một vài doc cũ chưa có sortAt có thể thêm orderBy createdAt
    const qn=query(
      collection(db,'notifications'),
      where('toUserId','==',user.uid),
      orderBy('sortAt','desc'),
      orderBy('createdAt','desc'),
      limit(30)
    );
    const unsub=onSnapshot(qn,(snap)=>{ setItems(snap.docs.map(d=>({id:d.id,...d.data()}))); });
    return ()=>unsub();
  },[user,open]);

  useEffect(()=>{ if(!open) return; const onKey=(e)=>{ if(e.key==='Escape') onClose?.(); }; window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey); },[open,onClose]);

  const decCounter=useCallback(async(uid,amount=1)=>{ const counterRef=doc(db,'user_counters',uid); await runTransaction(db, async tx=>{ const snap=await tx.get(counterRef); const cur=snap.exists()?(snap.data().unreadCount||0):0; tx.set(counterRef,{ unreadCount: Math.max(0, cur-amount) },{ merge:true }); }); },[]);
  const markRead=useCallback(async(id,isRead)=>{ if(!user) return; await updateDoc(doc(db,'notifications',id),{ isRead:true }); if(!isRead) await decCounter(user.uid,1); },[user,decCounter]);
  const markAllRead=useCallback(async()=>{ if(!user) return; const unreadIds=items.filter(i=>!i.isRead).map(i=>i.id); if(unreadIds.length===0) return; const batch=writeBatch(db); unreadIds.forEach(nid=>batch.update(doc(db,'notifications',nid),{ isRead:true })); await batch.commit(); await decCounter(user.uid, unreadIds.length); },[user,items,decCounter]);

  if(!open) return null;

  return (
    <div className="fixed right-3 top-14 z-50 w-[24rem] max-w-[92vw]">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-4 py-3 flex justify-between items-center border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-sky-50 to-white dark:from-gray-900 dark:to-gray-900">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">Thông báo</h4>
          <div className="flex items-center gap-2">
            <button onClick={markAllRead} className="text-xs px-2.5 py-1.5 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90">Đánh dấu tất cả đã đọc</button>
            <button onClick={onClose} className="text-sm text-slate-600 dark:text-slate-300 hover:underline">Đóng</button>
          </div>
        </div>

        <ul className="space-y-2 max-h-[65vh] overflow-auto p-3">
          {items.length===0 && <li className="text-sm text-slate-600 dark:text-slate-400 py-4 text-center">Chưa có thông báo</li>}
          {items.map(n=>{
            const t=formatDate(n.updatedAt || n.createdAt);
            const who=n.fromUserName||'Ai đó';
            const title=n.postTitle||`Bài viết ${n.postId}`;
            const content=n.commentText||'';
            const href=`/${n.postId}?comment=${n.commentId}#c-${n.commentId}`;
            const kind = n.type==='reply' ? { label:'Phản hồi', tone:'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' }
                       : n.type==='like'  ? { label:'Thích ❤️', tone:'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' }
                                          : { label:'Bình luận', tone:'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300' };
            const handleClick = async (e)=>{ e.preventDefault(); await markRead(n.id, n.isRead); onClose?.(); router.push(href); };
            return (
              <li key={n.id} className={`border border-slate-100 dark:border-gray-800 rounded-xl p-3 transition ${n.isRead?'bg-white dark:bg-gray-900':'bg-sky-50/60 dark:bg-gray-800/60'}`}>
                <Link href={href} onClick={handleClick} className="flex items-start gap-3 no-underline">
                  {!n.isRead && <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-sky-500 flex-shrink-0" aria-hidden/>}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-semibold text-sky-800 dark:text-sky-300">{who}</span>
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${kind.tone}`}>{kind.label}</span>
                      <span className="truncate text-sm text-slate-700 dark:text-slate-200">
                        trong <i className="font-medium"><span className="text-blue-600 hover:underline">{title}</span></i>
                      </span>
                    </div>
                    {content && <div className="mt-1 text-[13px] text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-lg p-2 line-clamp-3">"{content}"</div>}
                    {t && <div className="mt-1 text-[12px] text-slate-500" title={t.abs}>{t.rel}</div>}
                  </div>
                </Link>
                {!n.isRead && (
                  <div className="mt-2">
                    <button onClick={()=>markRead(n.id, n.isRead)} className="text-[12px] px-2 py-1 rounded bg-slate-900 text-white dark:bg-white dark:text-slate-900">Đã đọc</button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}