// components/Layout.js
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faTimes, faSun, faMoon, faSearch,
  faLayerGroup, faTools, faInfoCircle, faHome,
  faFilter, faSortAmountDown, faSortAlphaDown,
  faEnvelope, faFileAlt, faShieldAlt, faHeart
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const searchTimeoutRef = useRef(null);
  const abortControllerRef = useRef(null);

  /* Search states */
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  /* Dark mode handling */
  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  /* Fetch categories */
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('categories')
          .select('*, apps:apps(count)')
          .order('name', { ascending: true });
        setCategories(data || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    })();
  }, []);

  /* Improved search with debounce and abort */
  const runSearch = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setLoading(true);
    setSearchError(null);

    try {
      let query = supabase
        .from('apps')
        .select('*')
        .order(sortBy, { ascending: sortBy === 'name' });

      if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
      if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);

      const { data, error } = await query;

      if (error) throw error;
      if (!controller.signal.aborted) {
        setApps(data || []);
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        setSearchError('Lỗi khi tải dữ liệu');
        console.error('Search error:', error);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  /* Debounced search effect */
  useEffect(() => {
    if (searchOpen) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = setTimeout(() => {
        if (q.trim() || activeCategory !== 'all') {
          runSearch();
        } else {
          setApps([]);
        }
      }, 300);
    }

    return () => {
      clearTimeout(searchTimeoutRef.current);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [q, activeCategory, sortBy, searchOpen]);

  const handleAppClick = (slug) => {
    setSearchOpen(false);
    setQ('');
    setCategory('all');
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Head>
        <title>StreiOS – TestFlight & Jailbreak</title>
        <meta name="description" content="Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Desktop Nav (Left) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/" className="hover:text-red-600 cursor-pointer flex items-center gap-1">
              <FontAwesomeIcon icon={faHome} /> Trang chủ
            </Link>
            <Link href="/tools" className="hover:text-red-600 cursor-pointer flex items-center gap-1">
              <FontAwesomeIcon icon={faTools} /> Công cụ
            </Link>
            <Link href="/categories" className="hover:text-red-600 cursor-pointer flex items-center gap-1">
              <FontAwesomeIcon icon={faLayerGroup} /> Chuyên mục
            </Link>
          </nav>

          {/* Logo (Center) */}
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent mx-auto">
            StreiOS
          </Link>

          {/* Actions (Right) */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSearchOpen(true)} 
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Search"
            >
              <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setDarkMode(!darkMode)} 
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setMobileMenuOpen(true)} 
              className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- MOBILE MENU ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div 
            className="absolute top-0 left-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl p-6 space-y-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Menu</h2>
              <button 
                onClick={() => setMobileMenuOpen(false)} 
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <nav className="flex-1 space-y-4 text-sm font-medium">
              <Link href="/">
                <div onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <FontAwesomeIcon icon={faHome} className="w-5 h-5" />
                  <span>Trang chủ</span>
                </div>
              </Link>
              <Link href="/tools">
                <div onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <FontAwesomeIcon icon={faTools} className="w-5 h-5" />
                  <span>Công cụ</span>
                </div>
              </Link>
              <Link href="/categories">
                <div onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <FontAwesomeIcon icon={faLayerGroup} className="w-5 h-5" />
                  <span>Chuyên mục</span>
                </div>
              </Link>
              <Link href="/about">
                <div onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5" />
                  <span>Giới thiệu</span>
                </div>
              </Link>
            </nav>
            
            <div className="space-y-3">
              <button 
                onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }} 
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition-colors"
              >
                <FontAwesomeIcon icon={faSearch} /> Tìm kiếm
              </button>
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="w-full flex items-center justify-center gap-2 py-2 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} /> 
                {darkMode ? 'Chế độ sáng' : 'Chế độ tối'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SEARCH MODAL ---------------- */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tìm kiếm ứng dụng</h2>
              <button 
                onClick={() => setSearchOpen(false)} 
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Nhập tên ứng dụng..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faFilter} className="text-gray-500" />
                <select 
                  value={activeCategory} 
                  onChange={(e) => setCategory(e.target.value)} 
                  className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.apps?.count || 0})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faSortAmountDown} className="text-gray-500" />
                <select 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)} 
                  className="bg-gray-100 dark:bg-gray-700 rounded px-3 py-2 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                >
                  <option value="created_at">Mới nhất</option>
                  <option value="name">Tên A-Z</option>
                </select>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {loading && (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              )}
              {searchError && (
                <div className="text-center py-4 text-red-500">{searchError}</div>
              )}
              {!loading && !searchError && !apps.length && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FontAwesomeIcon icon={faSearch} className="text-3xl mb-2 opacity-50" />
                  <p>Không tìm thấy kết quả phù hợp</p>
                </div>
              )}
              <ul className="space-y-2">
                {apps.map(app => (
                  <li 
                    key={app.id} 
                    onClick={() => handleAppClick(app.slug)} 
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <div className="flex-shrink-0">
                      <img 
                        src={app.icon_url || '/placeholder-icon.png'} 
                        alt={app.name} 
                        className="w-12 h-12 rounded-lg object-cover bg-gray-200 dark:bg-gray-600" 
                        onError={(e) => {
                          e.target.src = '/placeholder-icon.png';
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{app.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{app.author}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MAIN ---------------- */}
      <main className={`flex-1 ${fullWidth ? '' : 'max-w-screen-2xl mx-auto px-4 py-6 w-full'}`}>
        {children}
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
                StreiOS
              </Link>
              <span className="text-xs bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded-full">
                BETA
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400">
              Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS. Cập nhật liên tục.
            </p>
            <div className="flex items-center gap-4">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <FontAwesomeIcon icon={faGithub} className="w-5 h-5" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Liên kết nhanh</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faHome} className="w-4 h-4" />
                    Trang chủ
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/tools">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faTools} className="w-4 h-4" />
                    Công cụ
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/categories">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
                    Chuyên mục
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Chuyên mục</h3>
            <ul className="space-y-3">
              {categories.slice(0, 5).map(c => (
                <li key={c.id}>
                  <Link href={`/category/${c.id}`}>
                    <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center justify-between transition-colors">
                      <span>{c.name}</span>
                      <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                        {c.apps?.count || 0}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Hỗ trợ</h3>
            <ul className="space-y-3">
              <li>
                <Link href="/contact">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4" />
                    Liên hệ
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faFileAlt} className="w-4 h-4" />
                    Điều khoản
                  </span>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <span className="text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 cursor-pointer flex items-center gap-2 transition-colors">
                    <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4" />
                    Bảo mật
                  </span>
                </Link>
              </li>
            </ul>
            
            <button 
              onClick={() => window.open('https://www.buymeacoffee.com', '_blank')} 
              className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <FontAwesomeIcon icon={faHeart} />
              Ủng hộ chúng tôi
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
          <div className="max-w-screen-2xl mx-auto px-4">
            © {new Date().getFullYear()} StreiOS. Made with <FontAwesomeIcon icon={faHeart} className="text-red-500" /> for the iOS community.
          </div>
        </div>
      </footer>
    </div>
  );
}