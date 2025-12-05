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
  faExclamationTriangle,
  faUser,
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
    minute: '2-digit',
    second: '2-digit'
  }) : '';
};

/* ================= Function để lấy ALL users từ Firebase Auth và Firestore ================= */
async function fetchAllUsersCombined() {
  console.log('Bắt đầu fetch tất cả users...');
  
  try {
    // 1. Lấy tất cả users từ Firestore (users collection)
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    
    console.log(`Firestore trả về ${snapshot.size} documents trong collection 'users'`);
    
    const usersFromFirestore = [];
    const firestoreUserMap = new Map();
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const userId = docSnap.id;
      
      // Xử lý data với các field có thể có
      const userData = {
        id: userId,
        uid: userId,
        // Thông tin cơ bản
        email: data.email || data.Email || '',
        displayName: data.displayName || data.DisplayName || data.name || data.userName || data.username || '',
        photoURL: data.photoURL || data.PhotoURL || data.avatar || data.photoUrl || '',
        // Metadata
        createdAt: data.createdAt || data.CreatedAt || data.created_at || data.dateCreated || null,
        updatedAt: data.updatedAt || data.UpdatedAt || data.updated_at || data.lastUpdated || null,
        // Các field tùy chọn
        emailVerified: data.emailVerified || data.EmailVerified || data.email_verified || false,
        banned: data.banned || data.Banned || false,
        status: data.status || data.Status || 'active',
        providerData: data.providerData || data.provider || [],
        // Flags
        hasFirestoreDoc: true,
        hasAuthUser: false, // Sẽ được cập nhật sau
        lastSignInTime: data.lastSignInTime || null,
      };
      
      usersFromFirestore.push(userData);
      firestoreUserMap.set(userId, userData);
    });
    
    console.log(`Đã parse ${usersFromFirestore.length} users từ Firestore`);
    
    // 2. Try to get users count (không bắt lỗi nếu không được)
    let totalUsersCount = usersFromFirestore.length;
    try {
      const countSnapshot = await getCountFromServer(collection(db, 'users'));
      totalUsersCount = countSnapshot.data().count;
      console.log(`Tổng số users trong Firestore: ${totalUsersCount}`);
    } catch (countError) {
      console.warn('Không thể đếm tổng số users:', countError);
    }
    
    return {
      users: usersFromFirestore,
      totalCount: totalUsersCount,
      firestoreUserMap: firestoreUserMap
    };
    
  } catch (error) {
    console.error('Lỗi khi fetch users từ Firestore:', error);
    throw new Error(`Không thể tải danh sách người dùng: ${error.message}`);
  }
}

/* ================= User Status Badge ================= */
function UserStatusBadge({ userData, isAdminUser }) {
  // Kiểm tra trạng thái deleted
  const isDeleted = userData?.status === 'deleted' || userData?.isDeleted;
  
  if (isDeleted) {
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

  // Nếu có email nhưng chưa verify
  if (userData?.email && !userData?.emailVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
        <FontAwesomeIcon icon={faTimesCircle} />
        Chưa xác minh
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
    admin: 0,
    noName: 0,
    noEmail: 0
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Check admin status and load users
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setDebugInfo('Đang khởi tạo...');
        
        // Lấy user hiện tại
        const unsub = auth.onAuthStateChanged(async (user) => {
          setCurrentUser(user);
          
          if (!user) {
            setError('Bạn cần đăng nhập để truy cập trang này');
            router.push('/login');
            return;
          }
          
          try {
            console.log('Current user UID:', user.uid);
            setDebugInfo(`Đang kiểm tra quyền admin cho UID: ${user.uid}`);
            
            // Check if user is admin
            const adminSnap = await getDoc(doc(db, 'app_config', 'admins'));
            const admins = Array.isArray(adminSnap.data()?.uids) ? adminSnap.data().uids : [];
            console.log('Admin UIDs:', admins);
            setAdminUids(admins);
            
            const isAdmin = admins.includes(user.uid);
            console.log('Is current user admin?', isAdmin);
            setIsCurrentUserAdmin(isAdmin);
            
            if (!isAdmin) {
              setError('Bạn không có quyền truy cập trang admin');
              setTimeout(() => router.push('/'), 2000);
              return;
            }
            
            setDebugInfo('Đang tải danh sách người dùng...');
            // Load all users
            await loadAllUsers(admins);
            
          } catch (error) {
            console.error('Admin check error:', error);
            setError('Lỗi kiểm tra quyền admin: ' + error.message);
            setIsCurrentUserAdmin(false);
            setLoading(false);
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
      setDebugInfo('Đang fetch users từ Firestore...');
      
      const result = await fetchAllUsersCombined();
      const { users: usersData, totalCount } = result;
      
      setDebugInfo(`Đã load ${usersData.length} users, tổng trong DB: ${totalCount}`);
      setTotalUsersCount(totalCount);
      
      // Process users: mark admin users and ensure all fields exist
      const processedUsers = usersData.map(user => {
        const isAdmin = admins.includes(user.uid);
        
        // Generate display name if missing
        let displayName = user.displayName || '';
        if (!displayName && user.email) {
          displayName = user.email.split('@')[0];
        } else if (!displayName) {
          displayName = `User_${user.uid.substring(0, 8)}`;
        }
        
        return {
          ...user,
          isAdmin: isAdmin,
          displayName: displayName,
          // Ensure boolean fields
          emailVerified: user.emailVerified || false,
          banned: user.banned || false,
          // Check if user has minimal data
          hasMinimalData: !!(user.email || user.displayName),
          // Last activity
          lastActivity: user.updatedAt || user.createdAt,
        };
      });
      
      // Sort by creation date (newest first)
      processedUsers.sort((a, b) => {
        const dateA = toDate(a.createdAt)?.getTime() || 0;
        const dateB = toDate(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      });
      
      setAllUsers(processedUsers);
      
      // Calculate stats
      calculateStats(processedUsers, admins);
      
      console.log(`Loaded ${processedUsers.length} users successfully`);
      setDebugInfo(`Hoàn tất: ${processedUsers.length} users đã được tải`);
      
    } catch (error) {
      console.error('Error loading all users:', error);
      setError('Lỗi tải danh sách người dùng: ' + error.message);
      setDebugInfo(`Lỗi: ${error.message}`);
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
      noName: 0,
      noEmail: 0,
      incomplete: 0
    };
    
    userList.forEach(user => {
      // Count deleted users
      if (user.status === 'deleted' || user.isDeleted) {
        stats.deleted++;
        return;
      }
      
      // Count banned users
      if (user.banned) {
        stats.banned++;
      } else {
        stats.active++;
      }
      
      // Count unverified emails
      if (user.email && !user.emailVerified) {
        stats.unverified++;
      }
      
      // Count admin users
      if (admins.includes(user.uid)) {
        stats.admin++;
      }
      
      // Count users without display name
      if (!user.displayName || user.displayName === '') {
        stats.noName++;
      }
      
      // Count users without email
      if (!user.email || user.email === '') {
        stats.noEmail++;
      }
      
      // Count incomplete profiles
      if (!user.email || !user.displayName) {
        stats.incomplete++;
      }
    });
    
    setStats(stats);
    console.log('Calculated stats:', stats);
  };

  const refreshList = async () => {
    setLoading(true);
    setError(null);
    setDebugInfo('Đang làm mới danh sách...');
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
      setDebugInfo(`Lỗi làm mới: ${error.message}`);
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
            return user.status !== 'deleted' && !user.isDeleted && !user.banned;
          case 'banned':
            return user.banned === true;
          case 'deleted':
            return user.status === 'deleted' || user.isDeleted;
          case 'unverified':
            return user.email && !user.emailVerified;
          case 'admin':
            return adminUids.includes(user.uid);
          case 'noname':
            return !user.displayName || user.displayName === '';
          case 'noemail':
            return !user.email || user.email === '';
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

  // Helper function to handle user actions
  const handleUserAction = async (action, userId) => {
    if (!currentUser || !isCurrentUserAdmin) return;
    
    switch (action) {
      case 'view':
        router.push(`/users/${userId}`);
        break;
      case 'ban':
        if (window.confirm('Bạn có chắc muốn BAN người dùng này?')) {
          alert('Chức năng BAN đang được phát triển');
        }
        break;
      case 'unban':
        if (window.confirm('Bạn có chắc muốn gỡ BAN người dùng này?')) {
          alert('Chức năng gỡ BAN đang được phát triển');
        }
        break;
      case 'make_admin':
        if (window.confirm('Bạn có chắc muốn thêm quyền admin cho người dùng này?')) {
          alert('Chức năng thêm admin đang được phát triển');
        }
        break;
      case 'remove_admin':
        if (window.confirm('Bạn có chắc muốn xoá quyền admin của người dùng này?')) {
          alert('Chức năng xoá admin đang được phát triển');
        }
        break;
      case 'delete':
        if (window.confirm('Bạn có chắc muốn đánh dấu xoá người dùng này?')) {
          alert('Chức năng xoá đang được phát triển');
        }
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-3xl text-gray-400 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Đang tải danh sách người dùng...</p>
          {debugInfo && <p className="text-sm text-gray-400 mt-2">{debugInfo}</p>}
        </div>
      </div>
    );
  }

  if (error && !isCurrentUserAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md p-6">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xl text-rose-500 mb-4" />
          <h1 className="text-xl font-bold text-rose-600 mb-2">Lỗi</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <Link 
            href="/" 
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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
            
            {/* Debug info */}
            {debugInfo && (
              <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">{debugInfo}</p>
              </div>
            )}
            
            {/* Stats */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
              <div className="rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2">
                <div className="text-xs text-gray-500">Tổng số</div>
                <div className="text-lg font-semibold">{stats.total}</div>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-2">
                <div className="text-xs text-emerald-600 dark:text-emerald-400">Hoạt động</div>
                <div className="text-lg font-semibold">{stats.active}</div>
              </div>
              <div className="rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-2">
                <div className="text-xs text-rose-600 dark:text-rose-400">Bị BAN</div>
                <div className="text-lg font-semibold">{stats.banned}</div>
              </div>
              <div className="rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 p-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">Đã xoá</div>
                <div className="text-lg font-semibold">{stats.deleted}</div>
              </div>
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-2">
                <div className="text-xs text-amber-600 dark:text-amber-400">Chưa xác minh</div>
                <div className="text-lg font-semibold">{stats.unverified}</div>
              </div>
              <div className="rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-2">
                <div className="text-xs text-purple-600 dark:text-purple-400">Admin</div>
                <div className="text-lg font-semibold">{stats.admin}</div>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2">
                <div className="text-xs text-blue-600 dark:text-blue-400">Không tên</div>
                <div className="text-lg font-semibold">{stats.noName}</div>
              </div>
              <div className="rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 p-2">
                <div className="text-xs text-orange-600 dark:text-orange-400">Không email</div>
                <div className="text-lg font-semibold">{stats.noEmail}</div>
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
                  <option value="unverified">Chưa xác minh email</option>
                  <option value="admin">Quản trị viên</option>
                  <option value="noname">Không có tên</option>
                  <option value="noemail">Không có email</option>
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
            
            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Hiển thị <span className="font-semibold">{filteredUsers.length}</span> người dùng phù hợp
                  {filteredUsers.length !== allUsers.length && ` (trong tổng ${allUsers.length})`}
                </div>
                <div className="text-sm text-gray-500">
                  Trang {page}/{totalFilteredPages}
                </div>
              </div>
            </div>
          </div>
          
          {/* Users table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {allUsers.length === 0 ? (
              <div className="py-12 text-center">
                <FontAwesomeIcon icon={faUser} className="text-4xl text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Không tìm thấy người dùng nào</p>
                <button
                  onClick={refreshList}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FontAwesomeIcon icon={faSync} className="mr-2" />
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
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Ngày tạo</th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Email</th>
                        <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 dark:text-gray-300">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedUsers.map(user => (
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
                                  {!user.displayName && (
                                    <span className="text-xs text-amber-600 ml-2">(chưa có tên)</span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate" title={user.uid}>
                                  {user.uid.substring(0, 10)}...
                                </div>
                                <div className="text-xs text-gray-500">
                                  {fmtDateTime(user.createdAt)}
                                </div>
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
                            <div className="text-xs text-gray-500">
                              {user.updatedAt ? `Cập nhật: ${fmtDate(user.updatedAt)}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate" title={user.email}>
                                {user.email || 'Không có email'}
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
                                className="px-2 py-1 text-xs rounded bg-sky-100 text-sky-700 hover:bg-sky-200 dark:bg-sky-900/30 dark:text-sky-300 inline-flex items-center"
                                title="Xem hồ sơ"
                              >
                                <FontAwesomeIcon icon={faEye} className="mr-1" />
                                Xem
                              </Link>
                              
                              {!(user.status === 'deleted' || user.isDeleted) && (
                                <>
                                  <button
                                    onClick={() => handleUserAction(user.banned ? 'unban' : 'ban', user.uid)}
                                    className={`px-2 py-1 text-xs rounded inline-flex items-center ${
                                      user.banned
                                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300'
                                        : 'bg-rose-100 text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-300'
                                    }`}
                                    title={user.banned ? 'Gỡ ban' : 'Ban tài khoản'}
                                  >
                                    <FontAwesomeIcon icon={user.banned ? faUnlock : faBan} className="mr-1" />