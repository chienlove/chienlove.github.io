// pages/admin/users.js
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { auth, db } from '../../lib/firebase-client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  updateDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { sendEmailVerification, deleteUser } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
  faUser,
  faUserCheck,
  faUserSlash,
  faUserShield,
  faEye,
  faTrash,
  faBan,
  faUnlock,
  faEnvelope,
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faSearch,
  faFilter,
  faArrowLeft,
  faSync,
} from '@fortawesome/free-solid-svg-icons';

/* ================= Helper functions ================= */
function toDate(ts) {
  try {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'number' || typeof ts === 'string') return new Date(ts);
    if (ts instanceof Date) return ts;
  } catch {}
  return null;
}

const fmtDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
};

const fmtRel = (ts) => {
  const d = toDate(ts);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60], ['second', 1]];
  for (const [u, s] of units) if (Math.abs(diff) >= s || u === 'second') return rtf.format(Math.round(diff / s * -1), u);
  return '';
};

/* ================= User Status Badge ================= */
function UserStatusBadge({ userData, banInfo }) {
  if (userData?.status === 'deleted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <FontAwesomeIcon icon={faUserSlash} />
        Đã xoá
      </span>
    );
  }

  if (banInfo?.banned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
        <FontAwesomeIcon icon={faBan} />
        {banInfo.mode === 'permanent' ? 'BAN vĩnh viễn' : 'BAN tạm thời'}
      </span>
    );
  }

  if (userData?.isAdmin) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
        <FontAwesomeIcon icon={faUserShield} />
        Admin
      </span>
    );
  }

  if (userData?.emailVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
        <FontAwesomeIcon icon={faUserCheck} />
        Đã xác minh
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
      <FontAwesomeIcon icon={faUserCircle} />
      Đang hoạt động
    </span>
  );
}

/* ================= User Actions ================= */
function UserActions({ userData, me, isAdmin, banInfo, onAction }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('');

  if (!me || !isAdmin) return null;

  const handleAction = async (action) => {
    if (!me || !isAdmin) return;
    
    setLoading(true);
    setActionType(action);
    
    try {
      if (action === 'verify_email') {
        // Gửi email xác minh
        const user = await auth.getUser(userData.uid);
        await sendEmailVerification(user);
        onAction?.('verify_email', 'Đã gửi email xác minh');
      } else if (action === 'toggle_ban') {
        // Toggle ban/unban
        const idToken = await me.getIdToken();
        const payload = {
          uid: userData.uid,
          action: banInfo?.banned ? 'unban' : 'ban',
          reason: 'Quản trị viên thao tác',
          mode: 'permanent'
        };
        
        const resp = await fetch('/api/admin/ban-user', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${idToken}` 
          },
          body: JSON.stringify(payload)
        });
        
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json?.error || 'Thao tác thất bại');
        
        onAction?.('toggle_ban', banInfo?.banned ? 'Đã gỡ ban' : 'Đã ban tài khoản');
      } else if (action === 'delete_user') {
        // Xoá tài khoản
        if (!confirm(`Bạn có chắc muốn xoá vĩnh viễn người dùng ${userData.displayName || userData.email}?\n\nHành động này sẽ:\n1. Xoá khỏi Firebase Authentication\n2. Đánh dấu đã xoá trong Firestore\n3. Xoá các bình luận liên quan`)) {
          setLoading(false);
          return;
        }
        
        const idToken = await me.getIdToken();
        const params = new URLSearchParams({
          uid: userData.uid,
          hard: '1',
          deleteAuth: '1',
        });
        
        const resp = await fetch(`/api/admin/delete-user-data?${params.toString()}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json?.error || 'Không xoá được dữ liệu.');
        
        onAction?.('delete_user', 'Đã xoá người dùng');
      } else if (action === 'make_admin') {
        // Thêm quyền admin
        const idToken = await me.getIdToken();
        const resp = await fetch('/api/admin/manage-admins', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json', 
            Authorization: `Bearer ${idToken}` 
          },
          body: JSON.stringify({
            action: 'add',
            uid: userData.uid
          })
        });
        
        const json = await resp.json();
        if (!resp.ok || !json.ok) throw new Error(json?.error || 'Thao tác thất bại');
        
        onAction?.('make_admin', 'Đã thêm quyền admin');
      }
    } catch (error) {
      alert(error.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
      setActionType('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {!userData?.emailVerified && (
        <button
          onClick={() => handleAction('verify_email')}
          disabled={loading}
          className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 disabled:opacity-50"
          title="Gửi email xác minh"
        >
          {actionType === 'verify_email' && loading ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
          ) : (
            <FontAwesomeIcon icon={faEnvelope} className="mr-1" />
          )}
          Xác minh
        </button>
      )}
      
      <button
        onClick={() => handleAction('toggle_ban')}
        disabled={loading}
        className={`px-2 py-1 text-xs rounded ${
          banInfo?.banned
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
        } disabled:opacity-50`}
        title={banInfo?.banned ? 'Gỡ ban' : 'Ban tài khoản'}
      >
        {actionType === 'toggle_ban' && loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
        ) : banInfo?.banned ? (
          <FontAwesomeIcon icon={faUnlock} className="mr-1" />
        ) : (
          <FontAwesomeIcon icon={faBan} className="mr-1" />
        )}
        {banInfo?.banned ? 'Gỡ ban' : 'Ban'}
      </button>
      
      {!userData?.isAdmin && (
        <button
          onClick={() => handleAction('make_admin')}
          disabled={loading}
          className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 disabled:opacity-50"
          title="Thêm quyền admin"
        >
          {actionType === 'make_admin' && loading ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
          ) : (
            <FontAwesomeIcon icon={faUserShield} className="mr-1" />
          )}
          Thêm Admin
        </button>
      )}
      
      <button
        onClick={() => handleAction('delete_user')}
        disabled={loading}
        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
        title="Xoá người dùng"
      >
        {actionType === 'delete_user' && loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
        ) : (
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
        )}
        Xoá
      </button>
      
      <Link
        href={`/users/${userData.uid}`}
        className="px-2 py-1 text-xs rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"
        title="Xem hồ sơ"
      >
        <FontAwesomeIcon icon={faEye} className="mr-1" />
        Xem
      </Link>
    </div>
  );
}

/* ================= Main Component ================= */
export default function AdminUsersPage() {
  const router = useRouter();
  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, banned, deleted, unverified, admin
  const [sortBy, setSortBy] = useState('createdAt_desc'); // createdAt_desc, createdAt_asc, name_asc, name_desc
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0, deleted: 0, unverified: 0, admin: 0 });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [banInfoMap, setBanInfoMap] = useState({});
  const [loadingBanInfo, setLoadingBanInfo] = useState(false);

  // Check admin status
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setMe(user || null);
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        const snap = await getDoc(doc(db, 'app_config', 'admins'));
        const admins = Array.isArray(snap.data()?.uids) ? snap.data().uids : [];
        const isUserAdmin = admins.includes(user.uid);
        setIsAdmin(isUserAdmin);
        
        if (!isUserAdmin) {
          router.push('/');
          return;
        }
        
        await loadUsers();
      } catch (error) {
        console.error('Admin check error:', error);
        router.push('/');
      }
    });
    
    return () => unsub();
  }, [router]);

  // Load ban info for users
  useEffect(() => {
    if (!me || !isAdmin || users.length === 0) return;
    
    const fetchBanInfo = async () => {
      setLoadingBanInfo(true);
      try {
        const idToken = await me.getIdToken();
        const promises = users.map(async (user) => {
          if (banInfoMap[user.uid]) return;
          
          try {
            const resp = await fetch(`/api/admin/ban-status?uid=${encodeURIComponent(user.uid)}`, {
              headers: { Authorization: `Bearer ${idToken}` }
            });
            const json = await resp.json();
            if (json?.ok) {
              setBanInfoMap(prev => ({
                ...prev,
                [user.uid]: {
                  banned: json.banned,
                  authDisabled: json.authDisabled,
                  reason: json.reason || null,
                  mode: json.mode || null,
                  expiresAt: json.expiresAt || null,
                  remainingMs: json.remainingMs || null,
                }
              }));
            }
          } catch (error) {
            console.error('Error fetching ban info:', error);
          }
        });
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error in fetchBanInfo:', error);
      } finally {
        setLoadingBanInfo(false);
      }
    };
    
    fetchBanInfo();
  }, [me, isAdmin, users, banInfoMap]);

  const loadUsers = async (loadMore = false) => {
    if (!isAdmin) return;
    
    if (!loadMore) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    
    try {
      let usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      
      if (loadMore && lastDoc) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }
      
      const snapshot = await getDocs(usersQuery);
      const userList = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        if (data) {
          userList.push({
            id: docSnap.id,
            ...data
          });
        }
      }
      
      if (!loadMore) {
        setUsers(userList);
      } else {
        setUsers(prev => [...prev, ...userList]);
      }
      
      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === pageSize);
      
      // Calculate stats
      calculateStats(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      if (!loadMore) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  };

  const calculateStats = (userList) => {
    const stats = {
      total: userList.length,
      active: 0,
      banned: 0,
      deleted: 0,
      unverified: 0,
      admin: 0,
    };
    
    // Load admin list
    const loadAdminStats = async () => {
      try {
        const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
        const adminUids = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
        
        userList.forEach(user => {
          if (user.status === 'deleted') {
            stats.deleted++;
          } else if (!user.emailVerified) {
            stats.unverified++;
          } else {
            stats.active++;
          }
          
          if (adminUids.includes(user.uid)) {
            stats.admin++;
          }
        });
        
        setStats(stats);
      } catch (error) {
        console.error('Error loading admin stats:', error);
      }
    };
    
    loadAdminStats();
  };

  const handleAction = (action, message) => {
    console.log(`${action}: ${message}`);
    // Refresh user list after action
    setPage(1);
    setLastDoc(null);
    loadUsers(false);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm ||
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        user.uid.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
      
      // Status filter
      const userBanInfo = banInfoMap[user.uid];
      
      switch (statusFilter) {
        case 'active':
          return user.status !== 'deleted' && (!userBanInfo || !userBanInfo.banned) && user.emailVerified;
        case 'banned':
          return userBanInfo?.banned === true;
        case 'deleted':
          return user.status === 'deleted';
        case 'unverified':
          return !user.emailVerified;
        case 'admin':
          // Need to check admin status
          return user.isAdmin === true;
        default:
          return true;
      }
    }).sort((a, b) => {
      // Sort filter
      const [field, direction] = sortBy.split('_');
      const dir = direction === 'desc' ? -1 : 1;
      
      if (field === 'createdAt') {
        const aDate = toDate(a.createdAt)?.getTime() || 0;
        const bDate = toDate(b.createdAt)?.getTime() || 0;
        return (aDate - bDate) * dir;
      } else if (field === 'name') {
        const aName = (a.displayName || a.email || '').toLowerCase();
        const bName = (b.displayName || b.email || '').toLowerCase();
        return aName.localeCompare(bName) * dir;
      }
      
      return 0;
    });
  }, [users, searchTerm, statusFilter, sortBy, banInfoMap]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
      setPage(prev => prev + 1);
      loadUsers(true);
    }
  };

  const refreshList = () => {
    setPage(1);
    setLastDoc(null);
    loadUsers(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-rose-600 mb-2">Truy cập bị từ chối</h1>
          <p className="text-gray-500 dark:text-gray-400">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Quản lý người dùng – Admin Panel</title>
      </Head>
      
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link
                  href="/admin"
                  className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                >
                  <FontAwesomeIcon icon={faArrowLeft} />
                  Quay lại Admin
                </Link>
                <h1 className="text-2xl font-bold">Quản lý người dùng</h1>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshList}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                  title="Làm mới danh sách"
                >
                  <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                </button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Tổng: <span className="font-semibold">{users.length}</span> người dùng
                </div>
              </div>
            </div>
            
            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500">Tổng số</div>
                <div className="text-lg font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-3">
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Đang hoạt động</div>
                <div className="text-lg font-semibold">{stats.active}</div>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-3">
                <div className="text-xs text-rose-600 dark:text-rose-400">Bị BAN</div>
                <div className="text-lg font-semibold">{stats.banned}</div>
              </div>
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-600 dark:text-gray-400">Đã xoá</div>
                <div className="text-lg font-semibold">{stats.deleted}</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
                <div className="text-xs text-amber-600 dark:text-amber-400">Chưa xác minh</div>
                <div className="text-lg font-semibold">{stats.unverified}</div>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-3">
                <div className="text-xs text-purple-600 dark:text-purple-400">Admin</div>
                <div className="text-lg font-semibold">{stats.admin}</div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Main content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Filters */}
          <div className="mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tìm kiếm</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tên, email hoặc UID..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Lọc theo trạng thái</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="banned">Bị BAN</option>
                  <option value="deleted">Đã xoá</option>
                  <option value="unverified">Chưa xác minh</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Sắp xếp</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="createdAt_desc">Mới nhất trước</option>
                  <option value="createdAt_asc">Cũ nhất trước</option>
                  <option value="name_asc">Tên A-Z</option>
                  <option value="name_desc">Tên Z-A</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Users table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Người dùng</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Trạng thái</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Ngày tham gia</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                    <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">
                        Không tìm thấy người dùng nào
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => (
                      <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                              {user.photoURL ? (
                                <img
                                  src={user.photoURL}
                                  alt={user.displayName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FontAwesomeIcon icon={faUserCircle} className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <div className="font-medium">{user.displayName || 'Không có tên'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{user.uid.substring(0, 8)}...</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <UserStatusBadge 
                            userData={user} 
                            banInfo={banInfoMap[user.uid]} 
                          />
                          {banInfoMap[user.uid]?.mode === 'temporary' && (
                            <div className="text-xs text-gray-500 mt-1">
                              Hết hạn: {fmtDate(banInfoMap[user.uid]?.expiresAt)}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{fmtDate(user.createdAt)}</div>
                          <div className="text-xs text-gray-500">{fmtRel(user.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{user.email}</span>
                            {user.emailVerified ? (
                              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" title="Đã xác minh email" />
                            ) : (
                              <FontAwesomeIcon icon={faTimesCircle} className="text-amber-500" title="Chưa xác minh email" />
                            )}
                          </div>
                          {user.providerData && (
                            <div className="text-xs text-gray-500 mt-1">
                              {user.providerData.map(p => p.providerId).join(', ')}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <UserActions 
                            userData={user}
                            me={me}
                            isAdmin={isAdmin}
                            banInfo={banInfoMap[user.uid]}
                            onAction={handleAction}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Load more */}
            {hasMore && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-4 text-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  {loadingMore ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-2" />
                      Đang tải...
                    </>
                  ) : (
                    'Tải thêm người dùng'
                  )}
                </button>
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            <p>Hiển thị {filteredUsers.length} người dùng</p>
          </div>
        </main>
      </div>
    </>
  );
}