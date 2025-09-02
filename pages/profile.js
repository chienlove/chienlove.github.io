// pages/profile.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import { auth, db, storage } from '../lib/firebase-client';
import {
  updateProfile,
  sendEmailVerification,
  GoogleAuthProvider,
  GithubAuthProvider,
  linkWithPopup,
  unlink,
  updateEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  reauthenticateWithPopup
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  deleteDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCheckCircle, faTimesCircle, faCloudArrowUp, faLink, faUnlink,
  faPen, faSave, faSpinner, faComment, faHeart, faCalendarAlt, faMedal, faExternalLinkAlt,
  faReply, faThumbsUp, faTrash, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub, faTwitter, faFacebook } from '@fortawesome/free-brands-svg-icons';

// Helper: Định dạng ngày
function formatDate(ts) {
  if (!ts) return '';
  try {
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return '';
  }
}

// Helper: Định dạng thời gian tương đối
function formatRelativeTime(ts) {
    if (!ts) return '';
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      const diff = (Date.now() - d.getTime()) / 1000;
      const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
      const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
      for (const [unit, sec] of units) {
        if (Math.abs(diff) >= sec || unit === 'second') {
          return rtf.format(Math.round(diff / sec * -1), unit);
        }
      }
      return '';
    } catch {
      return '';
    }
}

// =======================
// Các Component con
// =======================

// Component Toast (Thông báo nhanh)
function Toast({ toast, setToast }) {
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, setToast]);

  if (!toast) return null;

  const colors = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-sky-500',
  };

  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 rounded-full text-sm text-white shadow-lg ${colors[toast.type] || 'bg-gray-800'}`}>
      {toast.text}
    </div>
  );
}

// Component Huy hiệu
function Badge({ icon, label, color, condition }) {
  if (!condition) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${color}`}>
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

// Component Timeline Hoạt động
function ActivityFeed({ userId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'notifications'),
      where('fromUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsub = onSnapshot(q, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [userId]);

  if (loading) return <div className="text-center py-8 text-gray-500">Đang tải hoạt động...</div>;
  if (activities.length === 0) return <div className="text-center py-8 text-gray-500">Chưa có hoạt động nào.</div>;

  const renderActivity = (act) => {
    const time = formatRelativeTime(act.createdAt);
    const link = `/apps/${act.postId}#c-${act.commentId}`;
    switch (act.type) {
      case 'comment':
        return <><FontAwesomeIcon icon={faComment} className="text-blue-500" /> <span>Bạn đã bình luận về <strong>{act.postTitle || 'một bài đăng'}</strong>. <Link href={link} className="text-blue-600 hover:underline">Xem</Link></span></>;
      case 'reply':
        return <><FontAwesomeIcon icon={faReply} className="text-green-500" /> <span>Bạn đã trả lời một bình luận trong <strong>{act.postTitle || 'một bài đăng'}</strong>. <Link href={link} className="text-blue-600 hover:underline">Xem</Link></span></>;
      case 'like':
        return <><FontAwesomeIcon icon={faThumbsUp} className="text-rose-500" /> <span>Bạn đã thích một bình luận trong <strong>{act.postTitle || 'một bài đăng'}</strong>. <Link href={link} className="text-blue-600 hover:underline">Xem</Link></span></>;
      default:
        return <><FontAwesomeIcon icon={faComment} className="text-gray-500" /> <span>Hoạt động không xác định</span></>;
    }
  };

  return (
    <div className="space-y-4">
      {activities.map(act => (
        <div key={act.id} className="flex items-start gap-3 text-sm p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
          <div className="w-5 text-center">{renderActivity(act)?.[0]}</div>
          <div className="flex-1">
            {renderActivity(act)?.[1]}
            <div className="text-xs text-gray-500 mt-1">{time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Component Danh sách bình luận
function UserCommentsList({ userId }) {
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const q = query(
            collection(db, 'comments'),
            where('authorId', '==', userId),
            orderBy('createdAt', 'desc'),
            limit(30)
        );
        const unsub = onSnapshot(q, (snap) => {
            setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        }, () => setLoading(false));
        return () => unsub();
    }, [userId]);

    if (loading) return <div className="text-center py-8 text-gray-500">Đang tải bình luận...</div>;
    if (comments.length === 0) return <div className="text-center py-8 text-gray-500">Bạn chưa đăng bình luận nào.</div>;

    return (
        <ul className="space-y-3">
            {comments.map(c => (
                <li key={c.id} className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm whitespace-pre-wrap break-words">"{c.content}"</p>
                    <div className="text-xs text-gray-500 mt-2">
                        Đã đăng {formatRelativeTime(c.createdAt)} trong bài viết{' '}
                        <Link href={`/apps/${c.postId}#c-${c.id}`} className="text-blue-600 hover:underline">
                            này <FontAwesomeIcon icon={faExternalLinkAlt} className="w-2.5 h-2.5" />
                        </Link>
                    </div>
                </li>
            ))}
        </ul>
    );
}

// Component Modal xác nhận
function ConfirmModal({ open, title, message, onConfirm, onCancel, danger = false }) {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-lg text-white ${
              danger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}

// Component Cài đặt tài khoản
function AccountSettings({ user, onResendVerify, onLink, onUnlink }) {
    const providers = useMemo(() => (user?.providerData?.map(p => p.providerId) || []), [user]);
    const hasGoogle = providers.includes('google.com');
    const hasGithub = providers.includes('github.com');
    const hasPassword = providers.includes('password');

    const [newEmail, setNewEmail] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [showChangeEmail, setShowChangeEmail] = useState(false);
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChangeEmail = async () => {
      if (!newEmail.trim() || newEmail === user.email) return;
      
      try {
        setLoading(true);
        
        // Nếu có password, cần re-authenticate
        if (hasPassword && currentPassword) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);
        } else if (hasGoogle || hasGithub) {
          // Re-authenticate với provider
          const provider = hasGoogle ? new GoogleAuthProvider() : new GithubAuthProvider();
          await reauthenticateWithPopup(user, provider);
        }
        
        await updateEmail(user, newEmail.trim());
        await setDoc(doc(db, 'users', user.uid), { 
          email: newEmail.trim(), 
          updatedAt: serverTimestamp() 
        }, { merge: true });
        
        alert('Đã cập nhật email thành công!');
        setShowChangeEmail(false);
        setNewEmail('');
        setCurrentPassword('');
      } catch (error) {
        alert('Lỗi: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    const handleDeleteAccount = async () => {
      try {
        setLoading(true);
        
        // Re-authenticate trước khi xóa
        if (hasPassword && currentPassword) {
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);
        } else if (hasGoogle || hasGithub) {
          const provider = hasGoogle ? new GoogleAuthProvider() : new GithubAuthProvider();
          await reauthenticateWithPopup(user, provider);
        }

        // Xóa dữ liệu người dùng từ Firestore
        const batch = writeBatch(db);
        
        // Xóa user document
        batch.delete(doc(db, 'users', user.uid));
        
        // Xóa tất cả comments của user
        const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', user.uid));
        const commentsSnap = await getDocs(commentsQuery);
        commentsSnap.docs.forEach(doc => batch.delete(doc.ref));
        
        // Xóa tất cả notifications của user
        const notificationsQuery = query(collection(db, 'notifications'), where('toUserId', '==', user.uid));
        const notificationsSnap = await getDocs(notificationsQuery);
        notificationsSnap.docs.forEach(doc => batch.delete(doc.ref));
        
        await batch.commit();
        
        // Cuối cùng xóa tài khoản Firebase Auth
        await deleteUser(user);
        
        alert('Tài khoản đã được xóa thành công.');
        window.location.href = '/';
      } catch (error) {
        alert('Lỗi: ' + error.message);
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className="space-y-6">
            {/* Xác minh Email */}
            <div>
                <h4 className="font-semibold mb-2">Trạng thái Email</h4>
                <div className="flex items-center gap-3 text-sm">
                    {user.emailVerified ? (
                        <span className="inline-flex items-center gap-2 text-emerald-600">
                            <FontAwesomeIcon icon={faCheckCircle} /> Email đã xác minh
                        </span>
                    ) : (
                        <>
                            <span className="inline-flex items-center gap-2 text-amber-600">
                                <FontAwesomeIcon icon={faTimesCircle} /> Email chưa xác minh
                            </span>
                            <button onClick={onResendVerify} className="px-3 py-1.5 rounded-lg text-xs bg-amber-600 text-white hover:bg-amber-700">
                                Gửi lại email
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Đổi Email */}
            <div>
                <h4 className="font-semibold mb-2">Đổi Email</h4>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Email hiện tại: <strong>{user.email}</strong>
                </div>
                {!showChangeEmail ? (
                    <button 
                        onClick={() => setShowChangeEmail(true)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700"
                    >
                        Đổi email
                    </button>
                ) : (
                    <div className="space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <input
                            type="email"
                            placeholder="Email mới"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                        />
                        {hasPassword && (
                            <input
                                type="password"
                                placeholder="Mật khẩu hiện tại"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                            />
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleChangeEmail}
                                disabled={loading || !newEmail.trim()}
                                className="px-3 py-1.5 rounded-lg text-sm bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Đang cập nhật...' : 'Cập nhật'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowChangeEmail(false);
                                    setNewEmail('');
                                    setCurrentPassword('');
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Đăng nhập liên kết */}
            <div>
                <h4 className="font-semibold mb-2">Đăng nhập liên kết</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Google */}
                    <ProviderLinker icon={faGoogle} label="Google" providerId="google.com" hasLink={hasGoogle} onLink={() => onLink('google')} onUnlink={() => onUnlink('google.com')} />
                    {/* GitHub */}
                    <ProviderLinker icon={faGithub} label="GitHub" providerId="github.com" hasLink={hasGithub} onLink={() => onLink('github')} onUnlink={() => onUnlink('github.com')} />
                </div>
                <p className="mt-3 text-xs text-gray-500">
                    * Nếu email của bạn đã tồn tại với nhà cung cấp khác, hệ thống sẽ yêu cầu đăng nhập bằng nhà cung cấp cũ để liên kết.
                </p>
            </div>

            {/* Xóa tài khoản */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="font-semibold mb-2 text-rose-600">Vùng nguy hiểm</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Xóa tài khoản sẽ xóa vĩnh viễn tất cả dữ liệu của bạn bao gồm bình luận, thông báo và không thể khôi phục.
                </p>
                {!showDeleteAccount ? (
                    <button 
                        onClick={() => setShowDeleteAccount(true)}
                        className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700"
                    >
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                        Xóa tài khoản
                    </button>
                ) : (
                    <div className="space-y-3 p-3 border border-rose-200 dark:border-rose-800 rounded-lg bg-rose-50 dark:bg-rose-900/20">
                        <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                            Bạn có chắc chắn muốn xóa tài khoản? Hành động này không thể hoàn tác.
                        </p>
                        {hasPassword && (
                            <input
                                type="password"
                                placeholder="Nhập mật khẩu để xác nhận"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-rose-300 dark:border-rose-600 rounded-lg bg-white dark:bg-gray-800"
                            />
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading || (hasPassword && !currentPassword)}
                                className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                            >
                                {loading ? 'Đang xóa...' : 'Xác nhận xóa'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteAccount(false);
                                    setCurrentPassword('');
                                }}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function ProviderLinker({ icon, label, hasLink, onLink, onUnlink }) {
    return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 font-medium">
                <FontAwesomeIcon icon={icon} className="w-5 h-5" />
                <span>{label}</span>
            </div>
            {hasLink ? (
                <button onClick={onUnlink} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2" title={`Huỷ liên kết ${label}`}>
                    <FontAwesomeIcon icon={faUnlink} /> Huỷ
                </button>
            ) : (
                <button onClick={onLink} className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-90 flex items-center gap-2" title={`Liên kết ${label}`}>
                    <FontAwesomeIcon icon={faLink} /> Liên kết
                </button>
            )}
        </div>
    );
}


// =======================
// Component chính
// =======================
export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null); // Dữ liệu từ Firestore
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('activity');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [socialLinks, setSocialLinks] = useState({ twitter: '', github: '' });
  
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const fileInputRef = useRef(null);

  // Stats state
  const [stats, setStats] = useState({ comments: 0, likesReceived: 0 });

  // Lấy thông tin user và dữ liệu từ Firestore
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (u) {
        setUser(u);
        setDisplayName(u.displayName || '');
        const uref = doc(db, 'users', u.uid);
        const unsubDoc = onSnapshot(uref, (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            setUserData(data);
            setBio(data.bio || '');
            setSocialLinks(data.socialLinks || { twitter: '', github: '' });
            setStats(data.stats || { comments: 0, likesReceived: 0 });
          } else {
            // Tạo doc mới nếu chưa có
            setDoc(uref, {
              uid: u.uid, email: u.email, displayName: u.displayName, photoURL: u.photoURL,
              createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
              bio: '', socialLinks: { twitter: '', github: '' }, stats: { comments: 0, likesReceived: 0 }
            }, { merge: true });
          }
          setLoading(false);
        });
        return () => unsubDoc();
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // Tính toán thống kê thực tế từ Firestore
  useEffect(() => {
    if (!user) return;
    
    const calculateStats = async () => {
      try {
        // Đếm số bình luận
        const commentsQuery = query(collection(db, 'comments'), where('authorId', '==', user.uid));
        const commentsSnap = await getDocs(commentsQuery);
        const commentsCount = commentsSnap.size;
        
        // Đếm số lượt thích nhận được
        let likesReceived = 0;
        commentsSnap.docs.forEach(doc => {
          const data = doc.data();
          likesReceived += (data.likeCount || 0);
        });
        
        // Cập nhật stats vào Firestore
        const newStats = { comments: commentsCount, likesReceived };
        await setDoc(doc(db, 'users', user.uid), { 
          stats: newStats, 
          updatedAt: serverTimestamp() 
        }, { merge: true });
        
        setStats(newStats);
      } catch (error) {
        console.error('Error calculating stats:', error);
      }
    };
    
    calculateStats();
  }, [user]);

  const showToast = (type, text) => {
    setToast({ type, text });
  };

  const onUploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `avatars/${user.uid}/${Date.now()}_${file.name}`;
      const r = storageRef(storage, path);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateProfile(user, { photoURL: url });
      await setDoc(doc(db, 'users', user.uid), { photoURL: url, updatedAt: serverTimestamp() }, { merge: true });
      showToast('success', 'Đã cập nhật ảnh đại diện!');
    } catch (err) {
      showToast('error', 'Lỗi: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onSaveProfile = async () => {
    if (!user) return;
    if (!displayName.trim()) return showToast('error', 'Tên hiển thị không được để trống.');
    setSaving(true);
    try {
      const newDisplayName = displayName.trim();
      const newBio = bio.trim();
      const newSocials = {
        twitter: socialLinks.twitter.trim(),
        github: socialLinks.github.trim(),
      };

      // Cập nhật Firebase Auth Profile
      if (user.displayName !== newDisplayName) {
        await updateProfile(user, { displayName: newDisplayName });
      }
      
      // Cập nhật Firestore
      await setDoc(doc(db, 'users', user.uid), {
        displayName: newDisplayName,
        bio: newBio,
        socialLinks: newSocials,
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast('success', 'Đã lưu hồ sơ!');
    } catch (err) {
      showToast('error', 'Lỗi: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const onResendVerify = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      showToast('success', 'Đã gửi email xác minh!');
    } catch (err) {
      showToast('error', 'Lỗi: ' + err.message);
    }
  };

  const onLink = async (type) => {
    if (!user) return;
    try {
      const provider = type === 'google' ? new GoogleAuthProvider() : new GithubAuthProvider();
      await linkWithPopup(user, provider);
      showToast('success', `Đã liên kết ${type}!`);
    } catch (err) {
      showToast('error', 'Lỗi: ' + err.message);
    }
  };

  const onUnlink = async (providerId) => {
    if (!user) return;
    try {
      await unlink(user, providerId);
      showToast('success', 'Đã huỷ liên kết!');
    } catch (err) {
      showToast('error', 'Lỗi: ' + err.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="text-center py-20">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-400" />
          <p className="mt-4 text-gray-500">Đang tải trang hồ sơ...</p>
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <Head><title>Hồ sơ – StoreiOS</title></Head>
        <div className="w-full max-w-screen-md mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Hồ sơ cá nhân</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Bạn cần đăng nhập để xem trang này.</p>
          <button onClick={() => window.dispatchEvent(new Event('open-login'))} className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">
            Đăng nhập ngay
          </button>
        </div>
      </Layout>
    );
  }

  const avatar = user.photoURL || null;
  const memberSince = userData?.createdAt;
  const isVeteran = memberSince && (new Date() - memberSince.toDate()) > 365 * 24 * 60 * 60 * 1000;

  return (
    <Layout>
      <Head><title>Hồ sơ của {displayName || 'bạn'} – StoreiOS</title></Head>
      <Toast toast={toast} setToast={setToast} />

      <div className="max-w-screen-xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-8">
        {/* ===== CỘT TRÁI (SIDEBAR) ===== */}
        <aside className="lg:sticky top-24 self-start space-y-6">
          {/* Card thông tin cá nhân */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex flex-col items-center">
              <div className="relative mb-3">
                <div className="w-28 h-28 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  {avatar ? (
                    <img src={avatar} alt="avatar" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 text-gray-400" />
                  )}
                </div>
                <button onClick={() => fileInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-gray-800 text-white dark:bg-white dark:text-gray-900 flex items-center justify-center shadow-md hover:scale-110 transition-transform" title="Tải ảnh mới">
                  {uploading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin w-4 h-4" /> : <FontAwesomeIcon icon={faPen} className="w-3.5 h-3.5" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
              </div>
              
              <input id="displayName" className="text-xl font-bold text-center bg-transparent w-full focus:bg-gray-100 dark:focus:bg-gray-800 rounded-md px-2 py-1" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Tên của bạn" />
              <textarea id="bio" className="text-sm text-gray-600 dark:text-gray-400 text-center bg-transparent w-full mt-1 focus:bg-gray-100 dark:focus:bg-gray-800 rounded-md px-2 py-1 resize-none" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Thêm tiểu sử ngắn..." rows={2} />
            </div>

            <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faGithub} className="w-4 h-4 text-gray-500" />
                    <input value={socialLinks.github} onChange={e => setSocialLinks(p => ({...p, github: e.target.value}))} placeholder="Tên người dùng GitHub" className="text-sm bg-transparent w-full focus:bg-gray-100 dark:focus:bg-gray-800 rounded-md px-2 py-1" />
                </div>
                <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faTwitter} className="w-4 h-4 text-gray-500" />
                    <input value={socialLinks.twitter} onChange={e => setSocialLinks(p => ({...p, twitter: e.target.value}))} placeholder="Tên người dùng Twitter/X" className="text-sm bg-transparent w-full focus:bg-gray-100 dark:focus:bg-gray-800 rounded-md px-2 py-1" />
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button onClick={onSaveProfile} disabled={saving} className="w-full px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2">
                {saving ? <><FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Đang lưu...</> : <><FontAwesomeIcon icon={faSave} /> Lưu thay đổi</>}
              </button>
            </div>
          </div>

          {/* Card Thống kê & Huy hiệu */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
            <h3 className="font-bold mb-3">Thành tích</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faCalendarAlt} /> Ngày tham gia</span> <span className="font-medium">{formatDate(memberSince)}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faComment} /> Tổng bình luận</span> <span className="font-medium">{stats.comments}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faHeart} /> Lượt thích nhận</span> <span className="font-medium">{stats.likesReceived}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <Badge icon={faMedal} label="Thành viên kỳ cựu" color="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300" condition={isVeteran} />
                <Badge icon={faMedal} label="Người hoạt ngôn" color="bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300" condition={stats.comments >= 10} />
                <Badge icon={faMedal} label="Được yêu mến" color="bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300" condition={stats.likesReceived >= 20} />
            </div>
          </div>
        </aside>

        {/* ===== CỘT PHẢI (NỘI DUNG CHÍNH) ===== */}
        <main className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
          <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
            <TabButton id="activity" label="Hoạt động" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="comments" label="Bình luận" activeTab={activeTab} setActiveTab={setActiveTab} />
            <TabButton id="settings" label="Cài đặt" activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          <div>
            {activeTab === 'activity' && <ActivityFeed userId={user.uid} />}
            {activeTab === 'comments' && <UserCommentsList userId={user.uid} />}
            {activeTab === 'settings' && <AccountSettings user={user} onResendVerify={onResendVerify} onLink={onLink} onUnlink={onUnlink} />}
          </div>
        </main>
      </div>
    </Layout>
  );
}

function TabButton({ id, label, activeTab, setActiveTab }) {
  const isActive = activeTab === id;
  return (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

