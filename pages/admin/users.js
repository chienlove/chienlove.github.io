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
  limit,
  startAfter,
} from 'firebase/firestore';
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
  faArrowLeft,
  faSync,
  faHome,
  faCog,
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

/* ================= User Status Badge ================= */
function UserStatusBadge({ userData, isAdminUser, isBanned }) {
  if (userData?.status === 'deleted') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        <FontAwesomeIcon icon={faUserSlash} />
        Đã xoá
      </span>
    );
  }

  if (isBanned) {
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

  if (!currentUser || !isCurrentUserAdmin) return null;

  const handleAction = async (action) => {
    if (!currentUser || !isCurrentUserAdmin) return;
    
    setLoading(true);
    setActionType(action);
    
    try {
      if (action === 'verify_email') {
        alert('Chức năng gửi email xác minh cần được tích hợp với API');
        onAction?.('verify_email', 'Chức năng đang phát triển');
      } else if (action === 'toggle_ban') {
        const ok = window.confirm(`Bạn có chắc muốn ${userData.banned ? 'gỡ BAN' : 'BAN'} người dùng ${userData.displayName || userData.email}?`);
        if (!ok) {
          setLoading(false);
          return;
        }
        
        // Toggle ban status
        const newStatus = !userData.banned;
        await fetch('/api/admin/toggle-ban', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userData.uid, banned: newStatus })
        });
        
        onAction?.('toggle_ban', newStatus ? 'Đã BAN người dùng' : 'Đã gỡ BAN người dùng');
      } else if (action === 'delete_user') {
        if (!confirm(`Bạn có chắc muốn đánh dấu xoá người dùng ${userData.displayName || userData.email}?\n\nHành động này sẽ đánh dấu tài khoản là đã xoá.`)) {
          setLoading(false);
          return;
        }
        
        await fetch('/api/admin/mark-deleted', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userData.uid })
        });
        
        onAction?.('delete_user', 'Đã đánh dấu xoá người dùng');
      } else if (action === 'make_admin') {
        if (!confirm(`Bạn có chắc muốn thêm quyền admin cho ${userData.displayName || userData.email}?`)) {
          setLoading(false);
          return;
        }
        
        await fetch('/api/admin/add-admin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: userData.uid })
        });
        
        onAction?.('make_admin', 'Đã thêm quyền admin');
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
  const [pageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Check admin status and load users
  useEffect(() => {
    const checkAdminAndLoad = async () => {
      try {
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
            
            // Load users
            await loadUsers();
          } catch (error) {
            console.error('Admin check error:', error);
            setIsCurrentUserAdmin(false);
            router.push('/');
          }
        });
        
        return () => unsub();
      } catch (error) {
        console.error('Initialization error:', error);
        setLoading(false);
      }
    };
    
    checkAdminAndLoad();
  }, [router]);

  const loadUsers = async (loadMore = false) => {
    if (!isCurrentUserAdmin && currentUser) return;
    
    try {
      if (!loadMore) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      // Build query
      let usersQuery;
      if (loadMore && lastDoc) {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      } else {
        usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          limit(pageSize)
        );
      }
      
      const snapshot = await getDocs(usersQuery);
      const userList = [];
      
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        userList.push({
          id: docSnap.id,
          uid: docSnap.id,
          ...data
        });
      });
      
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
    let filtered = [...users];
    
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
            return user.status !== 'deleted' && !user.banned;
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
    
    return filtered;
  }, [users, searchTerm, statusFilter, adminUids]);

  const handleLoadMore = () => {
    if (hasMore && !loadingMore) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy người dùng nào phù hợp' : 'Không có người dùng nào'}
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
                              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-[120px]">
                                {user.uid}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <UserStatusBadge 
                            userData={user} 
                            isAdminUser={adminUids.includes(user.uid)}
                            isBanned={user.banned}
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm">{fmtDate(user.createdAt) || 'N/A'}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate max-w-[200px]">{user.email || 'N/A'}</span>
                            {user.emailVerified ? (
                              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 shrink-0" title="Đã xác minh email" />
                            ) : (
                              <FontAwesomeIcon icon={faTimesCircle} className="text-amber-500 shrink-0" title="Chưa xác minh email" />
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
            <p>Hiển thị {filteredUsers.length}/{users.length} người dùng</p>
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