import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import SearchModal from './SearchModal';
import LoginButton from './LoginButton';
import NotificationsPanel from './NotificationsPanel';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faTimes, faSearch, faTools, faLayerGroup, faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false, hotApps }) {
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

  useEffect(() => { (async () => {
    const { data } = await supabase.from('categories').select('*, apps:apps(count)').order('name', { ascending: true });
    setCategories(data || []);
  })(); }, []);

  const runSearch = async () => {
    setLoading(true);
    let query = supabase.from('apps').select('*').order(sortBy, { ascending: sortBy === 'name' });
    if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,author.ilike.%${q.trim()}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);
    const { data } = await query;
    setApps(data || []);
    setLoading(false);
  };
  useEffect(() => { if (searchOpen) runSearch(); }, [q, activeCategory, sortBy, searchOpen]);

  useEffect(() => {
    function handleClickOutside(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMobileMenuOpen(false); }
    if (mobileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <Head>
        <title>StoreIOS – TestFlight & Jailbreak</title>
        <meta name="description" content="Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS" />
      </Head>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-gray-900/85 backdrop-blur supports-[backdrop-filter]:backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden" aria-label="Menu">
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
            <Link href="/" className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
              StoreiOS
            </Link>
          </div>

          {/* Middle (desktop): minimal nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/tools" className="hover:text-red-600">Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600">Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600">Giới thiệu</Link>
          </nav>

          {/* Right: search pill + bell + avatar(menu) */}
          <div className="flex items-center gap-4">
            {/* Search pill (desktop) */}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 pl-3 pr-3 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Search"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              <span className="pr-1">Tìm kiếm…</span>
              <kbd className="hidden lg:inline rounded bg-white/70 dark:bg-black/30 px-1.5 py-0.5 text-[11px] border border-gray-300 dark:border-gray-700">/</kbd>
            </button>

            {/* Notifications (chỉ là text-link, panel nổi) */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="px-3 h-9 rounded-full bg-gray-100 dark:bg-gray-800 text-sm hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Thông báo
              </button>
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Auth (LoginButton chứa avatar & dropdown + dark mode) */}
            <LoginButton onToggleTheme={() => setDarkMode(v => !v)} isDark={darkMode} />
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex">
          <div ref={menuRef} className="w-80 max-w-[85%] bg-white dark:bg-gray-900 h-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Close">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Search quick */}
            <button
              onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-left flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              Tìm kiếm…
            </button>

            {/* Tools */}
            <div className="mt-6">
              <button
                onClick={() => setAccordionOpen({ ...accordionOpen, tools: !accordionOpen.tools })}
                className="flex items-center justify-between w-full text-left font-medium hover:text-red-600"
              >
                <span><FontAwesomeIcon icon={faTools} className="mr-2" />Công cụ</span>
                <FontAwesomeIcon icon={accordionOpen.tools ? faChevronUp : faChevronDown} />
              </button>
              {accordionOpen.tools && (
                <ul className="mt-2 ml-4 text-sm space-y-2">
                  <li><Link href="/tools/a" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">A</Link></li>
                  <li><Link href="/tools/b" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">B</Link></li>
                  <li><Link href="/tools/c" onClick={() => setMobileMenuOpen(false)} className="hover:text-red-600">C</Link></li>
                </ul>
              )}
            </div>

            {/* Categories */}
            <div className="mt-4">
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

            <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4">
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

      {/* FOOTER (giữ gọn) */}
      <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
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
            <h4 className="font-semibold text-white mb-3">Cập nhật</h4>
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