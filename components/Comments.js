import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc, collection, deleteDoc, doc, getDoc, setDoc, updateDoc,
  limit, onSnapshot, orderBy, query, runTransaction,
  serverTimestamp, where,
  arrayUnion, arrayRemove, increment,
  getDocs, startAfter
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faReply, faTrash, faUserCircle, faQuoteLeft, faHeart } from '@fortawesome/free-solid-svg-icons';

/* ===== Config ===== */
const LIKE_COOLDOWN_SEC = 60;

/* ===== Helpers ===== */
function preferredName(user){ if(!user) return 'Người dùng'; const p0=user.providerData?.[0]; return user.displayName||user.email||p0?.displayName||p0?.email||'Người dùng'; }
function preferredPhoto(user){ return user?.photoURL || user?.providerData?.[0]?.photoURL || ''; }
function formatDate(ts){ try{ let d=null; if(!ts) return null; if(ts.seconds) d=new Date(ts.seconds*1000); else if(typeof ts==='number'||typeof ts==='string') d=new Date(ts); else if(ts instanceof Date) d=ts; if(!d) return null; const diff=(Date.now()-d.getTime())/1000; const rtf=new Intl.RelativeTimeFormat('vi',{numeric:'auto'}); const units=[['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]]; for(const [u,s] of units){ if(Math.abs(diff)>=s||u==='second'){ const val=Math.round(diff/s*-1); return {rel: rtf.format(val,u), abs: d.toLocaleString('vi-VN')}; } } return {rel:'',abs:d.toLocaleString('vi-VN')}; }catch{ return null; } }
function excerpt(s,n=140){ const t=String(s||'').replace(/\s+/g,' ').trim(); return t.length>n?`${t.slice(0,n)}…`:t; }

/* ===== Notifications core ===== */
async function bumpCounter(uid, delta){
  if(!uid || !Number.isFinite(delta)) return;
  const ref=doc(db,'user_counters',uid);
  await runTransaction(db, async tx=>{
    const snap=await tx.get(ref);
    const cur=snap.exists()?(snap.data().unreadCount||0):0;
    tx.set(ref,{ unreadCount: Math.max(0, cur+delta), updatedAt: serverTimestamp() },{ merge:true });
  });
}

async function createNotification(payload={}){
  const {toUserId}=payload; if(!toUserId) return;
  await addDoc(collection(db,'notifications'),{
    ...payload,
    isRead:false,
    createdAt: serverTimestamp(),
    // sortAt để NotificationsPanel order theo hoạt động mới nhất (fallback nếu doc cũ chưa có sortAt)
    sortAt: serverTimestamp()
  });
}

/** Noti LIKE idempotent + cooldown + sortAt (để item luôn nổi lên đầu) */
async function upsertLikeNotification({ toUserId, postId, commentId, fromUser, cooldownSec=LIKE_COOLDOWN_SEC }){
  if(!toUserId || !commentId || !fromUser) return;
  if(toUserId===fromUser.uid) return; // chặn tự-notify

  const nid=`like_${toUserId}_${commentId}_${fromUser.uid}`;
  const nref=doc(db,'notifications',nid);
  const snap=await getDoc(nref);

  let shouldBump=true;
  if(snap.exists()){
    const ms=snap.data()?.updatedAt?.seconds ? snap.data().updatedAt.seconds*1000 : 0;
    if(Date.now()-ms < cooldownSec*1000) shouldBump=false;
  }

  await setDoc(nref,{
    toUserId, type:'like', postId:String(postId), commentId,
    fromUserId: fromUser.uid, fromUserName: preferredName(fromUser), fromUserPhoto: preferredPhoto(fromUser),
    createdAt: snap?.exists()? (snap.data().createdAt || serverTimestamp()) : serverTimestamp(),
    updatedAt: serverTimestamp(),
    sortAt: serverTimestamp(),
    isRead:false
  },{ merge:true });

  if(shouldBump) await bumpCounter(toUserId,+1);
}

/* ===== Users bootstrap ===== */
async function ensureUserDoc(u){
  if(!u) return;
  const uref=doc(db,'users',u.uid);
  const snap=await getDoc(uref);
  const base={ uid:u.uid, email:u.email||'', displayName:preferredName(u), photoURL:preferredPhoto(u), updatedAt: serverTimestamp() };
  if(!snap.exists()){
    await setDoc(uref,{ ...base, createdAt: serverTimestamp(), stats:{ comments:0, likesReceived:0 } },{ merge:true });
  }else{
    await setDoc(uref, base, { merge:true });
  }
}

/* ===== Small UI parts ===== */
const VerifiedBadgeX=({className=''})=>(
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={`inline-block ${className}`} fill="#1d9bf0">
    <path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34zm-11.71 4.2L6.8 12.46l1.41-1.42 2.26 2.26 4.8-5.23 1.47 1.36-6.2 6.77z"/>
  </svg>
);

function ActionBar({ hasLiked, likeCount, onToggleLike, renderReplyTrigger }){
  return (
    <div className="mt-2 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
      <button
        onClick={onToggleLike}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 transition-colors
          ${hasLiked ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 dark:text-rose-300 dark:bg-rose-900/30 dark:hover:bg-rose-900/40'
                     : 'text-gray-600 hover:text-rose-600 hover:bg-rose-50 dark:text-gray-300 dark:hover:text-rose-300 dark:hover:bg-rose-900/20'}`}
        title={hasLiked ? 'Bỏ thích' : 'Thích'}
      >
        <FontAwesomeIcon icon={faHeart}/>{likeCount>0 && <span>{likeCount}</span>}
      </button>
      {renderReplyTrigger?.()}
    </div>
  );
}

function CommentHeader({ c, me, isAdminFn, dt, canDelete, onDelete }){
  const isAdmin = isAdminFn?.(c.authorId);
  const isSelf = !!me && c.authorId===me.uid;
  const NameLink=({uid,children})=>{
    if(!uid) return <span className="font-semibold text-gray-900 dark:text-gray-100">{children}</span>;
    const href = isSelf? '/profile' : `/users/${uid}`;
    return <Link href={href} className="font-semibold text-gray-900 dark:text-gray-100 hover:text-sky-600 dark:hover:text-sky-400 hover:underline">{children}</Link>;
  };
  const avatar=c.userPhoto||'';
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-full border border-sky-200 dark:border-sky-700 flex items-center justify-center bg-sky-50 dark:bg-sky-900/40">
        {avatar ? <img src={avatar} alt="avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer"/> : <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6 text-sky-500"/>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <NameLink uid={c.authorId}>{c.userName||'Người dùng'}</NameLink>
          {isAdmin && <span className="inline-flex items-center translate-y-[0.5px]" title="Quản trị viên"><VerifiedBadgeX className="w-4 h-4"/></span>}
          {!!dt && <span className="text-xs text-gray-500 dark:text-gray-400" title={dt.abs}>{dt.rel}</span>}
          {canDelete && (
            <button onClick={onDelete} className="text-xs text-rose-600 hover:text-rose-700 ml-auto inline-flex items-center gap-1" title="Xoá">
              <FontAwesomeIcon icon={faTrash}/> Xoá
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Quote({ quoteFrom, me }){
  if(!quoteFrom) return null;
  return (
    <div className="mt-2 text-[13px] text-gray-700 dark:text-gray-300 bg-gradient-to-r from-sky-50 to-rose-50 dark:from-sky-900/20 dark:to-rose-900/20 border border-sky-100 dark:border-sky-800 rounded-xl p-2">
      <div className="flex items-center gap-2 mb-1 opacity-80">
        <FontAwesomeIcon icon={faQuoteLeft} className="w-3.5 h-3.5 text-sky-500"/>
        {quoteFrom.authorId
          ? <Link href={me && quoteFrom.authorId===me.uid ? '/profile' : `/users/${quoteFrom.authorId}`} className="font-medium hover:text-sky-600 dark:hover:text-sky-400 hover:underline">{quoteFrom.userName||'Người dùng'}</Link>
          : <span className="font-medium">{quoteFrom.userName||'Người dùng'}</span>}
      </div>
      <div className="whitespace-pre-wrap break-words">{excerpt(quoteFrom.content, 200)}</div>
    </div>
  );
}

function ReplyBox({ me, postId, parent, replyingTo=null, adminUids, postTitle, onNeedVerify, onNeedLogin, renderTrigger }){
  const [open,setOpen]=useState(false);
  const [text,setText]=useState('');
  const [sending,setSending]=useState(false);
  const target=replyingTo||parent;
  const canReply=!!me && me.uid!==(target?.authorId??'');

  const tryOpen=()=>{ if(!me) return onNeedLogin?.(); if(!me.emailVerified) return onNeedVerify?.(); setOpen(true); };

  const onReply=async(e)=>{ e.preventDefault();
    if(!me) return onNeedLogin?.(); if(!me.emailVerified) return onNeedVerify?.();
    if(!canReply || !text.trim() || sending) return;
    setSending(true);
    try{
      await ensureUserDoc(me);
      const ref=await addDoc(collection(db,'comments'),{
        postId:String(postId), parentId: parent.id, authorId: me.uid,
        userName: preferredName(me), userPhoto: preferredPhoto(me),
        content: text.trim(), createdAt: serverTimestamp(),
        replyToUserId: target.authorId||null, likeCount:0, likedBy:[]
      });
      setText(''); setOpen(false);
      await updateDoc(doc(db,'users',me.uid),{ 'stats.comments': increment(1) });

      if(target.authorId && target.authorId!==me.uid){
        await createNotification({
          toUserId: target.authorId, type:'reply', postId:String(postId), commentId: ref.id,
          fromUserId: me.uid, fromUserName: preferredName(me), fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle||'', commentText: excerpt(text)
        });
        await bumpCounter(target.authorId,+1);
      }
      const others=adminUids.filter(u=>u!==me.uid && u!==target.authorId);
      await Promise.all(others.map(async uid=>{
        await createNotification({
          toUserId: uid, type:'comment', postId:String(postId), commentId: ref.id,
          fromUserId: me.uid, fromUserName: preferredName(me), fromUserPhoto: preferredPhoto(me),
          postTitle: postTitle||'', commentText: excerpt(text)
        });
        await bumpCounter(uid,+1);
      }));
    }finally{ setSending(false); }
  };

  return (
    <>
      {/* ẨN nút trả lời nếu là của chính mình */}
      {!open && canReply && (renderTrigger ? renderTrigger(tryOpen) : (
        <button onClick={tryOpen} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline">
          <FontAwesomeIcon icon={faReply}/> Trả lời
        </button>
      ))}
      {open && (
        <form onSubmit={onReply} className="flex flex-col gap-2 mt-2">
          {target && (
            <div className="text-[12px] text-gray-700 dark:text-gray-300 bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 border border-sky-100 dark:border-sky-800 rounded-xl p-2">
              {target.authorId
                ? <Link href={me && target.authorId===me.uid ? '/profile' : `/users/${target.authorId}`} className="font-medium hover:text-sky-600 dark:hover:text-sky-400 hover:underline">{target.userName||'Người dùng'}</Link>
                : <span className="font-medium">{target.userName||'Người dùng'}</span>}
              : {excerpt(target.content,160)}
            </div>
          )}
          <textarea value={text} onChange={e=>setText(e.target.value)} className="w-full min-h-[72px] border border-indigo-200 dark:border-indigo-900 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500/40 outline-none shadow-[0_0_0_1px_rgba(129,140,248,0.25)]" placeholder={`Phản hồi ${replyingTo ? (replyingTo.userName||'người dùng') : (parent.userName||'người dùng')}…`} maxLength={2000}/>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={()=>{setOpen(false); setText('');}} className="px-3 py-2 text-sm rounded-xl border border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">Huỷ</button>
            <button type="submit" disabled={!text.trim()||sending} className={`px-4 py-2 text-sm rounded-xl inline-flex items-center gap-2 text-white ${!text.trim()||sending?'bg-gray-400 cursor-not-allowed':'bg-gradient-to-r from-indigo-600 to-violet-600 hover:opacity-95'}`}>{sending?'Đang gửi…':'Gửi'}</button>
          </div>
        </form>
      )}
    </>
  );
}

/* ===== Main ===== */
export default function Comments({ postId, postTitle }){
  const [me,setMe]=useState(null);
  const [adminUids,setAdminUids]=useState([]);
  const [content,setContent]=useState('');

  const PAGE_SIZE=50;
  const [liveItems,setLiveItems]=useState([]);
  const [olderItems,setOlderItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const lastDocRef=useRef(null); const unsubRef=useRef(null); const [hasMore,setHasMore]=useState(false);
  const [likingIds,setLikingIds]=useState(()=>new Set());

  const [modalOpen,setModalOpen]=useState(false);
  const [modalTitle,setModalTitle]=useState(''); const [modalContent,setModalContent]=useState(null);
  const [modalActions,setModalActions]=useState(null); const [modalTone,setModalTone]=useState('info');

  const openHeaderLoginPopup=()=>{ if(typeof window==='undefined') return; try{window.dispatchEvent(new Event('close-login'));}catch{} try{window.dispatchEvent(new Event('open-auth'));}catch{} };
  const openLoginPrompt=()=>{ setModalTitle('Cần đăng nhập'); setModalContent(<p>Bạn cần <b>đăng nhập</b> để thực hiện thao tác này.</p>); setModalTone('info'); setModalActions(<><button onClick={()=>{setModalOpen(false); openHeaderLoginPopup();}} className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:opacity-90">Đăng nhập</button><button onClick={()=>setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Để sau</button></>); setModalOpen(true); };
  const openConfirm=(msg,onConfirm)=>{ setModalTitle('Xác nhận xoá'); setModalContent(<p>{msg}</p>); setModalTone('warning'); setModalActions(<><button onClick={()=>setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Huỷ</button><button onClick={async()=>{setModalOpen(false); await onConfirm();}} className="px-3 py-2 text-sm rounded-lg bg-rose-600 text-white hover:bg-rose-700">Xoá</button></>); setModalOpen(true); };
  const openVerifyPrompt=()=>{ setModalTitle('Cần xác minh email'); setModalContent(<div><p>Tài khoản của bạn <b>chưa xác minh email</b>. Vui lòng xác minh để bình luận.</p><p className="mt-2 text-xs text-gray-600">Không thấy email? Kiểm tra thư rác hoặc gửi lại.</p></div>); setModalTone('info'); setModalActions(<><button onClick={async()=>{ try{ if(auth.currentUser) await sendEmailVerification(auth.currentUser); setModalContent(<p>Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.</p>); setModalTone('success'); }catch{ setModalContent(<p>Không gửi được email xác minh. Thử lại sau.</p>); setModalTone('error'); } }} className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700">Gửi lại email xác minh</button><button onClick={()=>setModalOpen(false)} className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-white">Để sau</button></>); setModalOpen(true); };

  useEffect(()=>{ const unsub=auth.onAuthStateChanged(setMe); return ()=>unsub(); },[]);
  useEffect(()=>{ (async()=>{ try{ const snap=await getDoc(doc(db,'app_config','admins')); if(snap.exists()){ const arr=Array.isArray(snap.data().uids)?snap.data().uids:[]; setAdminUids(arr); } }catch{} })(); },[]);

  // realtime trang 1
  useEffect(()=>{
    if(!postId) return;
    setLoading(true); setOlderItems([]); setHasMore(false); lastDocRef.current=null;
    if(unsubRef.current){ unsubRef.current(); unsubRef.current=null; }
    const q1=query(collection(db,'comments'), where('postId','==',String(postId)), orderBy('createdAt','desc'), limit(PAGE_SIZE));
    const unsub=onSnapshot(q1,(snap)=>{
      const list=snap.docs.map(d=>({id:d.id, ...d.data()}));
      setLiveItems(list);
      const last=snap.docs[snap.docs.length-1]||null;
      lastDocRef.current=last; setHasMore(!!last); setLoading(false);
    });
    unsubRef.current=unsub; return ()=>{ if(unsubRef.current) unsubRef.current(); unsubRef.current=null; };
  },[postId]);

  // vá thiếu tên/ảnh (của chính mình) trong trang 1
  useEffect(()=>{ if(!me||!liveItems.length) return;
    const fixes=liveItems.filter(c=>c.authorId===me.uid && (!c.userName||!c.userPhoto))
      .map(c=>updateDoc(doc(db,'comments',c.id),{ userName:c.userName||preferredName(me), userPhoto:c.userPhoto||preferredPhoto(me) }).catch(()=>{}));
    if(fixes.length) Promise.all(fixes).catch(()=>{});
  },[me,liveItems]);

  const items=useMemo(()=>[...liveItems,...olderItems],[liveItems,olderItems]);
  const roots=items.filter(c=>!c.parentId);
  const repliesByParent=useMemo(()=>{ const m={}; items.forEach(c=>{ if(c.parentId) (m[c.parentId] ||= []).push(c); }); Object.values(m).forEach(arr=>arr.sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0))); return m; },[items]);

  const loadMore=async()=>{ if(!postId||loadingMore||!lastDocRef.current) return; setLoadingMore(true);
    try{ const q2=query(collection(db,'comments'), where('postId','==',String(postId)), orderBy('createdAt','desc'), startAfter(lastDocRef.current), limit(PAGE_SIZE));
      const snap=await getDocs(q2); const list=snap.docs.map(d=>({id:d.id,...d.data()}));
      setOlderItems(prev=>[...prev,...list]); const last=snap.docs[snap.docs.length-1]||null; lastDocRef.current=last; setHasMore(!!last);
    }finally{ setLoadingMore(false); }
  };

  // Submit bình luận (root)
  const [submitting,setSubmitting]=useState(false);
  const onSubmit=async(e)=>{ e.preventDefault();
    if(!me) return openLoginPrompt(); if(!me.emailVerified) return openVerifyPrompt();
    if(!content.trim()||submitting) return;
    setSubmitting(true);
    try{
      await ensureUserDoc(me);
      const payload={ postId:String(postId), parentId:null, authorId: me.uid, userName: preferredName(me), userPhoto: preferredPhoto(me), content: content.trim(), createdAt: serverTimestamp(), replyToUserId:null, likeCount:0, likedBy:[] };
      const ref=await addDoc(collection(db,'comments'), payload);
      setContent('');
      await updateDoc(doc(db,'users',me.uid),{ 'stats.comments': increment(1) });
      const targets=adminUids.filter(u=>u!==me.uid);
      await Promise.all(targets.map(async uid=>{
        await createNotification({ toUserId: uid, type:'comment', postId:String(postId), commentId: ref.id, fromUserId: me.uid, fromUserName: preferredName(me), fromUserPhoto: preferredPhoto(me), postTitle: postTitle||'', commentText: excerpt(payload.content) });
        await bumpCounter(uid,+1);
      }));
    }finally{ setSubmitting(false); }
  };

  // Toggle ❤️ like (chặn tự-like, sinh noti khi like)
  const toggleLike=async(c)=>{
    if(!me){ openLoginPrompt(); return; }
    if(me.uid===c.authorId) return;            // chặn tự-like
    if(likingIds.has(c.id)) return;            // chặn double click
    setLikingIds(prev=>{ const s=new Set(prev); s.add(c.id); return s; });

    const ref=doc(db,'comments',c.id);
    const hasLiked=Array.isArray(c.likedBy)&&c.likedBy.includes(me.uid);
    try{
      await updateDoc(ref,{ likedBy: hasLiked? arrayRemove(me.uid): arrayUnion(me.uid), likeCount: increment(hasLiked? -1:+1) });
      if(c.authorId){ await updateDoc(doc(db,'users',c.authorId),{ 'stats.likesReceived': increment(hasLiked? -1:+1) }); }
      if(!hasLiked && c.authorId){
        const pid = c.postId ?? postId; // fallback
        await upsertLikeNotification({ toUserId: c.authorId, postId: String(pid), commentId: c.id, fromUser: me });
      }
    }finally{
      setLikingIds(prev=>{ const s=new Set(prev); s.delete(c.id); return s; });
    }
  };

  // Xoá thread (root + replies) -- xoá trước, cập nhật stats "best‑effort"
  const deleteThreadSafe=async(root, replies=[])=>{
    await Promise.all([
      deleteDoc(doc(db,'comments',root.id)),
      ...replies.map(r=>deleteDoc(doc(db,'comments',r.id)))
    ]).catch(()=>{});
    try{
      if(root.authorId) await updateDoc(doc(db,'users',root.authorId),{ 'stats.comments': increment(-1) });
      await Promise.all(replies.map(async r=>{ if(r.authorId) await updateDoc(doc(db,'users',r.authorId),{ 'stats.comments': increment(-1) }); }));
    }catch{}
  };

  return (
    <div className="mt-6">
      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setModalOpen(false)}/>
          <div className={`relative w-[92vw] max-w-md rounded-2xl border shadow-2xl p-4 ${modalTone==='success'?'border-emerald-300 bg-emerald-50':modalTone==='error'?'border-rose-300 bg-rose-50':modalTone==='warning'?'border-amber-300 bg-amber-50':'border-sky-300 bg-sky-50'}`}>
            {modalTitle && <h3 className="text-lg font-semibold mb-2">{modalTitle}</h3>}
            <div className="text-sm text-gray-900">{modalContent}</div>
            <div className="mt-4 flex justify-end gap-2">{modalActions}</div>
          </div>
        </div>
      )}

      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-3">Bình luận</h3>

      {!me ? (
        <div className="text-sm text-gray-700 dark:text-gray-300">Hãy đăng nhập để bình luận.</div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <textarea value={content} onChange={e=>setContent(e.target.value)} className="w-full min-h-[96px] border border-sky-200 dark:border-sky-900 rounded-xl px-3 py-2 text-[16px] leading-6 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-sky-500/40 outline-none shadow-[0_0_0_1px_rgba(56,189,248,0.25)]" placeholder="Viết bình luận..." maxLength={3000}/>
          <div className="flex justify-end">
            <button type="submit" disabled={!content.trim()||submitting} className={`px-4 py-2 rounded-xl inline-flex items-center gap-2 text-white shadow-sm ${!content.trim()||submitting?'bg-gray-400 cursor-not-allowed':'bg-gradient-to-r from-sky-600 to-blue-600 hover:opacity-95 active:scale-95'}`}>
              <FontAwesomeIcon icon={faPaperPlane}/> {submitting?'Đang gửi…':'Gửi'}
            </button>
          </div>
        </form>
      )}

      <div className="mt-4">
        {loading ? <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải bình luận…</div>
        : roots.length===0 ? <div className="text-sm text-gray-500 dark:text-gray-400">Chưa có bình luận.</div>
        : (
          <>
            <ul className="space-y-4">
              {roots.map(c=>{
                const replies=repliesByParent[c.id]||[];
                const dt = formatDate(c.createdAt);
                const hasLiked = !!me && Array.isArray(c.likedBy) && c.likedBy.includes(me.uid);
                const likeCount = c.likeCount||0;
                return (
                  <li key={c.id} id={`c-${c.id}`} className="scroll-mt-24 rounded-2xl p-3 bg-white/95 dark:bg-gray-900/95 border border-transparent [background:linear-gradient(#fff,rgba(255,255,255,0.96))_padding-box,linear-gradient(135deg,#bae6fd,#fecaca)_border-box] dark:[background:linear-gradient(#0b0f19,#0b0f19)_padding-box,linear-gradient(135deg,#0ea5e9,#f43f5e)_border-box] hover:shadow-md transition-shadow">
                    <CommentHeader c={c} me={me} isAdminFn={uid=>adminUids.includes(uid)} dt={dt} canDelete={!!me&&(me.uid===c.authorId||adminUids.includes(me.uid))} onDelete={()=>openConfirm('Xoá bình luận này và toàn bộ phản hồi của nó?', async()=>{ try{ await deleteThreadSafe(c, replies); }catch{} })}/>
                    <div className="mt-2 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">{c.content}</div>
                    <ReplyBox me={me} postId={postId} parent={c} adminUids={adminUids} postTitle={postTitle||''} onNeedVerify={openVerifyPrompt} onNeedLogin={openLoginPrompt} renderTrigger={(openFn)=>(<ActionBar hasLiked={hasLiked} likeCount={likeCount} onToggleLike={()=>toggleLike(c)} renderReplyTrigger={()=> (me && me.uid!==c.authorId ? <button onClick={openFn} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline"><FontAwesomeIcon icon={faReply}/> Trả lời</button> : null) }/>)}/>
                    {replies.map(r=>{
                      const target = r.replyToUserId===c.authorId ? c : (replies.find(x=>x.authorId===r.replyToUserId)||null);
                      const dt2 = formatDate(r.createdAt);
                      const rHasLiked = !!me && Array.isArray(r.likedBy) && r.likedBy.includes(me.uid);
                      const rLikeCount = r.likeCount||0;
                      return (
                        <div key={r.id} id={`c-${r.id}`} className="mt-3 pl-4 border-l-2 border-sky-200 dark:border-sky-800 scroll-mt-24">
                          <CommentHeader c={r} me={me} isAdminFn={uid=>adminUids.includes(uid)} dt={dt2} canDelete={!!me&&(me.uid===r.authorId||adminUids.includes(me.uid))} onDelete={()=>openConfirm('Bạn có chắc muốn xoá phản hồi này?', async()=>{ try{ await deleteDoc(doc(db,'comments',r.id)); if(r.authorId) await updateDoc(doc(db,'users',r.authorId),{ 'stats.comments': increment(-1) }); }catch{} })}/>
                          {target && <Quote quoteFrom={target} me={me}/>}
                          <div className="mt-2 whitespace-pre-wrap break-words text-gray-900 dark:text-gray-100 leading-6">{r.content}</div>
                          <ReplyBox me={me} postId={postId} parent={c} replyingTo={r} adminUids={adminUids} postTitle={postTitle||''} onNeedVerify={openVerifyPrompt} onNeedLogin={openLoginPrompt} renderTrigger={(openFn)=>(<ActionBar hasLiked={rHasLiked} likeCount={rLikeCount} onToggleLike={()=>toggleLike(r)} renderReplyTrigger={()=> (me && me.uid!==r.authorId ? <button onClick={openFn} className="inline-flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300 hover:underline"><FontAwesomeIcon icon={faReply}/> Trả lời</button> : null) }/>)}/>
                        </div>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button onClick={loadMore} disabled={loadingMore} className={`px-4 py-2 rounded-xl border inline-flex items-center justify-center ${loadingMore?'text-gray-500 border-gray-300 cursor-not-allowed':'text-sky-700 border-sky-200 hover:bg-sky-50'}`}>{loadingMore?'Đang tải…':'Xem thêm bình luận cũ'}</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}