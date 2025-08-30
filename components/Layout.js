import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import SearchModal from './SearchModal';
import LoginButton from './LoginButton';
import NotificationsBell from './NotificationsBell';
import NotificationsPanel from './NotificationsPanel';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun, faMoon, faSearch, faBars, faTimes,
  faTools, faLayerGroup, faChevronDown, faChevronUp,
  faCode, faLock, faRocket, faBell
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false, hotApps }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState({ tools: true, categories: true });

  const menuRef = useRef(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    const prefers = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('*, apps:apps(count)')
        .order('name', { ascending: true });
      setCategories(data || []);
    })();
  }, []);

  const runSearch = async () => {
    setLoading(true);
    let query = supabase
      .from('apps')
      .select('*')
      .order(sortBy, { ascending: sortBy === 'name' });

    if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,author.ilike.%${q.trim()}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);

    const { data } = await query;
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => { if (searchOpen) runSearch(); }, [q, activeCategory, sortBy, searchOpen]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMobileMenuOpen(false);
    }
    if (mobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Head>
        <title>StoreIOS – TestFlight & Jailbreak</title>
        <meta name="description" content="Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS" />
      </Head>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left: hamburger + logo */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
            <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
              StoreiOS
            </Link>
          </div>

          {/* Middle: quick nav (desktop) */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/tools" className="hover:text-red-600">Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600">Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600">Giới thiệu</Link>
          </nav>

          {/* Right: search / theme / notifications / auth */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Search">
              <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Toggle theme">
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={() => setNotifOpen(v => !v)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Notifications">
                <FontAwesomeIcon icon={faBell} className="w-5 h-5" />
              </button>
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Auth */}
            <LoginButton />
          </div>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex">
          <div ref={menuRef} className="w-72 bg-white dark:bg-gray-900 p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <button
              onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
              className="w-full px-3 py-2 rounded bg-gray-100 dark:bg-gray-800 text-left"
            >
              Tìm kiếm…
            </button>

            {/* Tools */}
            <div>
              <button
                onClick={() => setAccordionOpen({ ...accordionOpen, tools: !accordionOpen.tools })}
                className="flex items-center justify-between w-full text-left font-medium hover:text-red-600"
              >
                <span><FontAwesomeIcon icon={faTools} className="mr-2" />Công cụ</span>
                <FontAwesomeIcon icon={accordionOpen.tools ? faChevronUp : faChevronDown} />
              </button>
              {accordionOpen.tools && (
                <ul className="mt-2 ml-4 text-sm space-y-2">
                  <li><Link href="/tools/a" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 hover:text-red-600"><FontAwesomeIcon icon={faCode} />A</Link></li>
                  <li><Link href="/tools/b" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 hover:text-red-600"><FontAwesomeIcon icon={faLock} />B</Link></li>
                  <li><Link href="/tools/c" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 hover:text-red-600"><FontAwesomeIcon icon={faRocket} />C</Link></li>
                </ul>
              )}
            </div>

            {/* Categories */}
            <div>
              <button
                onClick={() => setAccordionOpen({ ...accordionOpen, categories: !accordionOpen.categories })}
                className="flex items-center justify-between w-full text-left font-medium hover:text-red-600"
              >
                <span><FontAwesomeIcon icon={faLayerGroup} className="mr-2" />Chuyên mục</span>
                <FontAwesomeIcon icon={accordionOpen.categories ? faChevronUp : faChevronDown} />
              </button>
              {accordionOpen.categories && (
                <ul className="mt-2 ml-4 text-sm space-y-2">
                  <li><Link href="/categories/jailbreak" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">Jailbreak</Link></li>
                  <li><Link href="/categories/testflight" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">TestFlight App</Link></li>
                </ul>
              )}
            </div>

            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <Link href="/notifications" onClick={() => setMobileMenuOpen(false)} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">Thông báo</Link>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">Đăng nhập / Đăng ký</Link>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODAL */}
      <SearchModal
        q={q} setQ={setQ}
        activeCategory={activeCategory} setCategory={setCategory}
        sortBy={sortBy} setSortBy={setSortBy}
        apps={apps} loading={loading}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        categories={categories}
        hotApps={hotApps}
      />

      {/* MAIN */}
      <main className={`flex-1 ${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">StoreiOS</h3>
            <p className="text-gray-400 text-sm">Kho ứng dụng TestFlight beta & công cụ jailbreak cho cộng đồng iOS.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Điều hướng</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tools" className="hover:text-white">Công cụ</Link></li>
              <li><Link href="/categories" className="hover:text-white">Chuyên mục</Link></li>
              <li><Link href="/about" className="hover:text-white">Giới thiệu</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Bảo mật</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Liên hệ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white">Liên hệ trực tiếp</Link></li>
              <li><a href="mailto:support@storeios.net" className="hover:text-white">Email hỗ trợ</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3">Kết nối</h4>
            <p className="text-sm text-gray-400">Theo dõi để không bỏ lỡ app TestFlight hot.</p>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 border-t border-gray-800 py-6">
          © {new Date().getFullYear()} StoreiOS – Made with ❤️ for the iOS community.
        </div>
      </footer>
    </div>
  );
}