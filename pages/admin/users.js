// pages/admin/users.js
import { useEffect, useState, useMemo, useCallback } from 'react';
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
  limit,
  startAfter,
  getCountFromServer,
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle,
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
  faArrowLeft,
  faSync,
  faHome,
  faCog,
  faFilter,
  faUsers,
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
  return d ? d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
};

const fmtDateTime = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('vi-VN', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';
};

/* ================= User Status Badge ================= */
function UserStatusBadge({ userData, isAdminUser }) {
  if (userData?.status === 'deleted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <FontAwesomeIcon icon={faUserSlash} />
        Đã xoá
      </span>
    );
  }

  if (userData?.banned) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
        <FontAwesomeIcon icon={faBan} />
        Bị BAN
      </span>
    );
  }

  if (isAdminUser) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
        <FontAwesomeIcon icon={faUserShield} />
        Admin
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
      <FontAwesomeIcon icon={faUserCheck} />
      Đang hoạt động
    </span>
  );
}

/* ================= User Actions ================= */
function UserActions({ userData, currentUser, isCurrentUserAdmin, onAction }) {
  const [loading, setLoading] = useState(false);
  const [actionType, setActionType] = useState('');

  if (!currentUser || !isCurrentUserAdmin || userData.status === 'deleted') return null;

  const handleAction = async (action) => {
    if (!currentUser || !isCurrentUserAdmin) return;
    
    setLoading(true);
    setActionType(action);
    
    try {
      const idToken = await currentUser.getIdToken();
      
      if (action === 'toggle_ban') {
        const ok = window.confirm(`Bạn có chắc muốn ${userData.banned ? 'gỡ BAN' : 'BAN'} người dùng ${userData.displayName || userData.email}?`);
        if (!ok) {
          setLoading(false);
          return;
        }
        
        // Toggle ban status
        const newStatus = !userData.banned;
        const resp = await fetch('/api/admin/toggle-ban', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ 
            uid: userData.uid, 
            banned: newStatus,
            reason: 'Admin thao tác'
          })
        });
        
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Thao tác thất bại');
        
        onAction?.('toggle_ban', newStatus ? 'Đã BAN người dùng' : 'Đã gỡ BAN người dùng');
      } else if (action === 'delete_user') {
        if (!confirm(`Bạn có chắc muốn đánh dấu xoá người dùng ${userData.displayName || userData.email}?\n\nHành động này sẽ đánh dấu tài khoản là đã xoá.`)) {
          setLoading(false);
          return;
        }
        
        const resp = await fetch('/api/admin/mark-deleted', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ uid: userData.uid })
        });
        
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Thao tác thất bại');
        
        onAction?.('delete_user', 'Đã đánh dấu xoá người dùng');
      } else if (action === 'make_admin') {
        if (!confirm(`Bạn có chắc muốn ${userData.isAdmin ? 'xoá quyền admin' : 'thêm quyền admin'} cho ${userData.displayName || userData.email}?`)) {
          setLoading(false);
          return;
        }
        
        const resp = await fetch('/api/admin/manage-admin', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify({ 
            uid: userData.uid, 
            action: userData.isAdmin ? 'remove' : 'add'
          })
        });
        
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error || 'Thao tác thất bại');
        
        onAction?.('make_admin', userData.isAdmin ? 'Đã xoá quyền admin' : 'Đã thêm quyền admin');
      }
    } catch (error) {
      console.error('Action error:', error);
      alert(error.message || 'Lỗi không xác định');
    } finally {
      setLoading(false);
      setActionType('');
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Link
        href={`/users/${userData.uid}`}
        className="px-2 py-1 text-xs rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"
        title="Xem hồ sơ"
      >
        <FontAwesomeIcon icon={faEye} className="mr-1" />
        Xem
      </Link>
      
      <button
        onClick={() => handleAction('toggle_ban')}
        disabled={loading}
        className={`px-2 py-1 text-xs rounded ${
          userData.banned
            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
        } disabled:opacity-50`}
        title={userData.banned ? 'Gỡ ban' : 'Ban tài khoản'}
      >
        {actionType === 'toggle_ban' && loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
        ) : userData.banned ? (
          <FontAwesomeIcon icon={faUnlock} className="mr-1" />
        ) : (
          <FontAwesomeIcon icon={faBan} className="mr-1" />
        )}
        {userData.banned ? 'Gỡ ban' : 'Ban'}
      </button>
      
      <button
        onClick={() => handleAction('make_admin')}
        disabled={loading}
        className={`px-2 py-1 text-xs rounded ${
          userData.isAdmin
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
        } disabled:opacity-50`}
        title={userData.isAdmin ? 'Xoá quyền admin' : 'Thêm quyền admin'}
      >
        {actionType === 'make_admin' && loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
        ) : (
          <FontAwesomeIcon icon={faUserShield} className="mr-1" />
        )}
        {userData.isAdmin ? 'Xoá Admin' : 'Thêm Admin'}
      </button>
      
      <button
        onClick={() => handleAction('delete_user')}
        disabled={loading}
        className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 disabled:opacity-50"
        title="Đánh dấu đã xoá"
      >
        {actionType === 'delete_user' && loading ? (
          <FontAwesomeIcon icon={faSpinner} className="animate-spin mr-1" />
        ) : (
          <FontAwesomeIcon icon={faTrash} className="mr-1" />
        )}
        Xoá
      </button>
    </div>
  );
}

/* ================= Main Component ================= */
export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [adminUids, setAdminUids] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({ 
    total: 0, 
    active: 0, 
    banned: 0, 
    deleted: 0, 
    unverified: 0, 
    admin: 0 
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Check admin status
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        // Check if user is admin
        const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
        const admins = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
        setAdminUids(admins);
        
        const isAdmin = admins.includes(user.uid);
        setIsCurrentUserAdmin(isAdmin);
        
        if (!isAdmin) {
          router.push('/');
          return;
        }
        
        // Get total count of users
        const usersCount = await getCountFromServer(collection(db, 'users'));
        setTotalUsers(usersCount.data().count);
        
        // Load first page of users
        await loadUsers(1);
        setInitialLoadComplete(true);
        
      } catch (error) {
        console.error('Admin check error:', error);
        setIsCurrentUserAdmin(false);
        router.push('/');
      }
    });
    
    return () => unsub();
  }, [router]);

  const loadUsers = async (pageNum = 1, loadMore = false) => {
    if (!isCurrentUserAdmin) return;
    
    try {
      if (!loadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Calculate offset
      const offset = (pageNum - 1) * pageSize;
      
      // Get all users first (we need to filter client-side for complex queries)
      let usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(usersQuery);
      const userList = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        userList.push({
          id: docSnap.id,
          uid: docSnap.id,
          ...data,
          // Ensure boolean fields
          emailVerified: data.emailVerified || false,
          banned: data.banned || false,
          isAdmin: adminUids.includes(docSnap.id) || false,
          status: data.status || 'active'
        });
      });
      
      // Update all users for filtering
      setAllUsers(userList);
      
      // Apply pagination
      const startIndex = (pageNum - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedUsers = userList.slice(startIndex, endIndex);
      
      if (!loadMore) {
        setUsers(paginatedUsers);
      } else {
        setUsers(prev => [...prev, ...paginatedUsers]);
      }
      
      // Calculate stats
      calculateStats(userList);
      
      setPage(pageNum);
      
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Lỗi khi tải danh sách người dùng: ' + error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
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
    
    userList.forEach(user => {
      if (user.status === 'deleted') {
        stats.deleted++;
      } else if (user.banned) {
        stats.banned++;
      } else {
        stats.active++;
      }
      
      if (!user.emailVerified) {
        stats.unverified++;
      }
      
      if (adminUids.includes(user.uid)) {
        stats.admin++;
      }
    });
    
    setStats(stats);
  };

  const handleAction = (action, message) => {
    console.log(`${action}: ${message}`);
    // Refresh user list after action
    refreshList();
  };

  const filteredUsers = useMemo(() => {
    let filtered = [...allUsers];
    
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        (user.uid || '').toLowerCase().includes(searchLower)
      );
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active':
            return user.status !== 'deleted' && !user.banned && user.emailVerified;
          case 'banned':
            return user.banned === true;
          case 'deleted':
            return user.status === 'deleted';
          case 'unverified':
            return !user.emailVerified;
          case 'admin':
            return adminUids.includes(user.uid);
          default:
            return true;
        }
      });
    }
    
    // Apply pagination to filtered results
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return filtered.slice(startIndex, endIndex);
  }, [allUsers, searchTerm, statusFilter, adminUids, page, pageSize]);

  const totalFilteredPages = useMemo(() => {
    let filtered = [...allUsers];
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        (user.displayName || '').toLowerCase().includes(searchLower) ||
        (user.email || '').toLowerCase().includes(searchLower) ||
        (user.uid || '').toLowerCase().includes(searchLower)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => {
        switch (statusFilter) {
          case 'active':
            return user.status !== 'deleted' && !user.banned && user.emailVerified;
          case 'banned':
            return user.banned === true;
          case 'deleted':
            return user.status === 'deleted';
          case 'unverified':
            return !user.emailVerified;
          case 'admin':
            return adminUids.includes(user.uid);
          default:
            return true;
        }
      });
    }
    
    return Math.ceil(filtered.length / pageSize);
  }, [allUsers, searchTerm, statusFilter, adminUids, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalFilteredPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const refreshList = async () => {
    setLoading(true);
    try {
      // Refresh admin list
      const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
      const admins = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
      setAdminUids(admins);
      
      // Reload users
      await loadUsers(1);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!initialLoadComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Đang tải danh sách người dùng...</p>
        </div>
      </div>
    );
  }

  if (!isCurrentUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold text-rose-600 mb-2">Truy cập bị từ chối</h1>
          <p className="text-gray-500 dark:text-gray-400">Bạn không có quyền truy cập trang này.</p>
          <Link 
            href="/" 
            className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Quay về trang chủ
          </Link>
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
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <FontAwesomeIcon icon={faUsers} />
                  Quản lý người dùng
                </h1>
              </div>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshList}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
                  title="Làm mới danh sách"
                >
                  <FontAwesomeIcon icon={faSync} className={loading ? 'animate-spin' : ''} />
                </button>
                
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Tổng: <span className="font-semibold">{totalUsers}</span> người dùng
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
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <FontAwesomeIcon icon={faSearch} />
                  Tìm kiếm
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1); // Reset to page 1 when searching
                  }}
                  placeholder="Tên, email hoặc UID..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                  <FontAwesomeIcon icon={faFilter} />
                  Lọc theo trạng thái
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1); // Reset to page 1 when filtering
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="active">Đang hoạt động</option>
                  <option value="banned">Bị BAN</option>
                  <option value="deleted">Đã xoá</option>
                  <option value="unverified">Chưa xác minh</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Số lượng hiển thị</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1); // Reset to page 1 when changing page size
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={20}>20 người dùng/trang</option>
                  <option value={50}>50 người dùng/trang</option>
                  <option value={100}>100 người dùng/trang</option>
                  <option value={200}>200 người dùng/trang</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Users table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {loading ? (
              <div className="py-8 text-center">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-2xl text-gray-400 mb-2" />
                <p className="text-gray-500">Đang tải dữ liệu...</p>
              </div>
            ) : (
              <>
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
                            {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy người dùng nào phù hợp' : 'Không có người dùng nào'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map(user => (
                          <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
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
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{user.displayName || 'Không có tên'}</div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                                    {user.uid}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <UserStatusBadge 
                                userData={user} 
                                isAdminUser={adminUids.includes(user.uid)}
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">{fmtDate(user.createdAt) || 'N/A'}</div>
                              <div className="text-xs text-gray-500">{fmtDateTime(user.updatedAt)}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm truncate">{user.email || 'N/A'}</span>
                                {user.emailVerified ? (
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 flex-shrink-0" title="Đã xác minh email" />
                                ) : (
                                  <FontAwesomeIcon icon={faTimesCircle} className="text-amber-500 flex-shrink-0" title="Chưa xác minh email" />
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <UserActions 
                                userData={user}
                                currentUser={currentUser}
                                isCurrentUserAdmin={isCurrentUserAdmin}
                                onAction={handleAction}
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalFilteredPages > 1 && (
                  <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Hiển thị {Math.min(pageSize, filteredUsers.length)}/{allUsers.length} người dùng
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                        >
                          ← Trước
                        </button>
                        
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                            let pageNum;
                            if (totalFilteredPages <= 5) {
                              pageNum = i + 1;
                            } else if (page <= 3) {
                              pageNum = i + 1;
                            } else if (page >= totalFilteredPages - 2) {
                              pageNum = totalFilteredPages - 4 + i;
                            } else {
                              pageNum = page - 2 + i;
                            }
                            
                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-8 h-8 rounded ${page === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          {totalFilteredPages > 5 && (
                            <span className="px-2">...</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalFilteredPages}
                          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                        >
                          Tiếp →
                        </button>
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Trang {page}/{totalFilteredPages}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Navigation */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faCog} />
              Quay lại Admin Panel
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <FontAwesomeIcon icon={faHome} />
              Về trang chủ
            </Link>
          </div>
        </main>
      </div>
    </>
  );
}