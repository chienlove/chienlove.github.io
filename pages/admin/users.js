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
  faExclamationTriangle,
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

/* ================= Function để lấy tất cả users từ Firestore ================= */
async function fetchAllUsersFromFirestore() {
  console.log('Bắt đầu fetch tất cả users từ Firestore...');
  
  try {
    // Lấy tất cả documents từ collection 'users' mà không cần orderBy
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    console.log(`Firestore trả về ${snapshot.size} documents`);
    
    const users = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      console.log(`User ${docSnap.id}:`, data);
      
      // Xử lý data để đảm bảo có tất cả các field cần thiết
      const userData = {
        id: docSnap.id,
        uid: docSnap.id,
        email: data.email || data.Email || '',
        displayName: data.displayName || data.DisplayName || data.name || data.userName || data.username || 'Không có tên',
        photoURL: data.photoURL || data.PhotoURL || data.avatar || data.photoUrl || '',
        emailVerified: data.emailVerified || data.EmailVerified || data.email_verified || false,
        banned: data.banned || data.Banned || false,
        status: data.status || data.Status || 'active',
        createdAt: data.createdAt || data.CreatedAt || data.created_at || data.dateCreated || null,
        updatedAt: data.updatedAt || data.UpdatedAt || data.updated_at || data.lastUpdated || null,
        providerData: data.providerData || data.provider || [],
        isDeleted: data.status === 'deleted' || data.isDeleted || false
      };
      
      users.push(userData);
    });
    
    console.log(`Đã parse thành công ${users.length} users`);
    return users;
    
  } catch (error) {
    console.error('Lỗi khi fetch users từ Firestore:', error);
    throw error;
  }
}

/* ================= User Status Badge ================= */
function UserStatusBadge({ userData, isAdminUser }) {
  if (userData?.isDeleted || userData?.status === 'deleted') {
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

/* ================= Main Component ================= */
export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState(null);
  const [isCurrentUserAdmin, setIsCurrentUserAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
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
  const [error, setError] = useState(null);

  // Check admin status and load users
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        
        // Lấy user hiện tại
        const unsub = auth.onAuthStateChanged(async (user) => {
          setCurrentUser(user);
          
          if (!user) {
            router.push('/login');
            return;
          }
          
          try {
            console.log('Current user UID:', user.uid);
            
            // Check if user is admin
            const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
            const admins = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
            console.log('Admin UIDs:', admins);
            setAdminUids(admins);
            
            const isAdmin = admins.includes(user.uid);
            console.log('Is current user admin?', isAdmin);
            setIsCurrentUserAdmin(isAdmin);
            
            if (!isAdmin) {
              router.push('/');
              return;
            }
            
            // Load all users
            await loadAllUsers(admins);
            
          } catch (error) {
            console.error('Admin check error:', error);
            setError('Lỗi kiểm tra quyền admin: ' + error.message);
            setIsCurrentUserAdmin(false);
          }
        });
        
        return () => unsub();
      } catch (error) {
        console.error('Initialization error:', error);
        setError('Lỗi khởi tạo: ' + error.message);
        setLoading(false);
      }
    };
    
    initialize();
  }, [router]);

  const loadAllUsers = async (admins = []) => {
    try {
      console.log('Bắt đầu load tất cả users...');
      
      const usersData = await fetchAllUsersFromFirestore();
      console.log(`Đã load thành công ${usersData.length} users từ Firestore`);
      
      // Mark admin users
      const usersWithAdminFlag = usersData.map(user => ({
        ...user,
        isAdmin: admins.includes(user.uid) || false,
        // Đảm bảo có displayName
        displayName: user.displayName || user.email?.split('@')[0] || `User_${user.uid.substring(0, 6)}`,
        // Đảm bảo có emailVerified
        emailVerified: user.emailVerified || false,
        // Đảm bảo có banned
        banned: user.banned || false
      }));
      
      setAllUsers(usersWithAdminFlag);
      
      // Calculate stats
      calculateStats(usersWithAdminFlag, admins);
      
      console.log('Users loaded successfully:', usersWithAdminFlag.length);
      
    } catch (error) {
      console.error('Error loading all users:', error);
      setError('Lỗi tải danh sách người dùng: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (userList, admins) => {
    const stats = {
      total: userList.length,
      active: 0,
      banned: 0,
      deleted: 0,
      unverified: 0,
      admin: 0,
    };
    
    userList.forEach(user => {
      if (user.isDeleted || user.status === 'deleted') {
        stats.deleted++;
      } else if (user.banned) {
        stats.banned++;
      } else {
        stats.active++;
      }
      
      if (!user.emailVerified) {
        stats.unverified++;
      }
      
      if (admins.includes(user.uid)) {
        stats.admin++;
      }
    });
    
    setStats(stats);
    console.log('Calculated stats:', stats);
  };

  const refreshList = async () => {
    setLoading(true);
    setError(null);
    try {
      // Refresh admin list
      const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
      const admins = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
      setAdminUids(admins);
      
      // Reload users
      await loadAllUsers(admins);
      setPage(1);
    } catch (error) {
      console.error('Refresh error:', error);
      setError('Lỗi làm mới: ' + error.message);
    } finally {
      setLoading(false);
    }
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
            return !user.isDeleted && user.status !== 'deleted' && !user.banned;
          case 'banned':
            return user.banned === true;
          case 'deleted':
            return user.isDeleted || user.status === 'deleted';
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
  }, [allUsers, searchTerm, statusFilter, adminUids]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, page, pageSize]);

  const totalFilteredPages = useMemo(() => {
    return Math.ceil(filteredUsers.length / pageSize);
  }, [filteredUsers.length, pageSize]);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalFilteredPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
                  Tổng: <span className="font-semibold">{stats.total}</span> người dùng
                </div>
              </div>
            </div>
            
            {/* Error message */}
            {error && (
              <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg border border-rose-200 dark:border-rose-800">
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-rose-500" />
                  <span className="text-sm text-rose-700 dark:text-rose-300">{error}</span>
                </div>
              </div>
            )}
            
            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-3">
              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3">
                <div className="text-xs text-gray-500">Tổng số</div>
                <div className="text-lg font-semibold">{stats.total}</div>
                <div className="text-xs text-gray-400">đã tải</div>
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
                    setPage(1);
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
                    setPage(1);
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
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={20}>20 người dùng/trang</option>
                  <option value={50}>50 người dùng/trang</option>
                  <option value={100}>100 người dùng/trang</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Users table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {allUsers.length === 0 ? (
              <div className="py-8 text-center">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-2xl text-gray-400 mb-2" />
                <p className="text-gray-500">Không có người dùng nào</p>
                <button
                  onClick={refreshList}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Thử lại
                </button>
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
                      {paginatedUsers.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">
                            {searchTerm || statusFilter !== 'all' ? 'Không tìm thấy người dùng nào phù hợp' : 'Không có người dùng nào'}
                          </td>
                        </tr>
                      ) : (
                        paginatedUsers.map(user => (
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
                                  <div className="font-medium truncate" title={user.displayName}>
                                    {user.displayName}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={user.uid}>
                                    {user.uid.substring(0, 12)}...
                                  </div>
                                  {!user.displayName && (
                                    <div className="text-xs text-amber-600">Chưa có tên hiển thị</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <UserStatusBadge 
                                userData={user} 
                                isAdminUser={adminUids.includes(user.uid)}
                              />
                              {!user.email && (
                                <div className="text-xs text-gray-500 mt-1">Không có email</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-sm">{fmtDate(user.createdAt) || 'N/A'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-sm truncate" title={user.email}>
                                  {user.email || 'N/A'}
                                </span>
                                {user.email && user.emailVerified ? (
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 flex-shrink-0" title="Đã xác minh email" />
                                ) : user.email ? (
                                  <FontAwesomeIcon icon={faTimesCircle} className="text-amber-500 flex-shrink-0" title="Chưa xác minh email" />
                                ) : null}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-2">
                                <Link
                                  href={`/users/${user.uid}`}
                                  className="px-2 py-1 text-xs rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300"
                                  title="Xem hồ sơ"
                                >
                                  <FontAwesomeIcon icon={faEye} className="mr-1" />
                                  Xem
                                </Link>
                                {!user.isDeleted && user.status !== 'deleted' && (
                                  <>
                                    <button
                                      className={`px-2 py-1 text-xs rounded ${
                                        user.banned
                                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
                                      }`}
                                      title={user.banned ? 'Gỡ ban' : 'Ban tài khoản'}
                                      onClick={() => alert('Chức năng ban sẽ được tích hợp sau')}
                                    >
                                      {user.banned ? (
                                        <FontAwesomeIcon icon={faUnlock} className="mr-1" />
                                      ) : (
                                        <FontAwesomeIcon icon={faBan} className="mr-1" />
                                      )}
                                      {user.banned ? 'Gỡ ban' : 'Ban'}
                                    </button>
                                    
                                    <button
                                      className={`px-2 py-1 text-xs rounded ${
                                        adminUids.includes(user.uid)
                                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300'
                                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300'
                                      }`}
                                      title={adminUids.includes(user.uid) ? 'Xoá quyền admin' : 'Thêm quyền admin'}
                                      onClick={() => alert('Chức năng quản lý admin sẽ được tích hợp sau')}
                                    >
                                      <FontAwesomeIcon icon={faUserShield} className="mr-1" />
                                      {adminUids.includes(user.uid) ? 'Xoá Admin' : 'Thêm Admin'}
                                    </button>
                                    
                                    <button
                                      className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
                                      title="Đánh dấu đã xoá"
                                      onClick={() => alert('Chức năng xoá sẽ được tích hợp sau')}
                                    >
                                      <FontAwesomeIcon icon={faTrash} className="mr-1" />
                                      Xoá
                                    </button>
                                  </>
                                )}
                              </div>
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
                        Hiển thị {paginatedUsers.length}/{filteredUsers.length} người dùng
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page === 1}
                          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                                className={`w-8 h-8 rounded ${page === pageNum ? 'bg-blue-600 text-white' : 'border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                          
                          {totalFilteredPages > 5 && (
                            <span className="px-2 text-gray-500">...</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page === totalFilteredPages}
                          className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
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
          
          {/* Debug info (chỉ hiển thị trong development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-medium mb-2">Debug Information</h3>
              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <div>• Total users loaded: {allUsers.length}</div>
                <div>• First user sample: {JSON.stringify(allUsers[0] || {})}</div>
                <div>• Admin UIDs count: {adminUids.length}</div>
              </div>
            </div>
          )}
          
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