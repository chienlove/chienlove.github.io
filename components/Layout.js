// components/Layout.js  (FIXED)
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faTimes, faSun, faMoon, faSearch,
  faLayerGroup, faTools, faInfoCircle,
  faFilter, faSortAmountDown, faSortAlphaDown
} from '@fortawesome/free-solid-svg-icons';

/* -------------------------------------------------- */
export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Search states */
  const [searchOpen, setSearchOpen]   = useState(false);
  const [q, setQ]                     = useState('');
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy]           = useState('created_at');
  const [apps, setApps]               = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(false);

  /* ---------- 1. Dark-mode: gán class sớm để không flash ---------- */
  useEffect(() => {
    // đọc từ localStorage hoặc OS
    const stored = localStorage.getItem('darkMode');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  /* ---------- 2. Lấy danh mục ---------- */
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('*, apps:apps(count)')
        .order('name', { ascending: true });
      setCategories(data || []);
    })();
  }, []);

  /* ---------- 3. Tìm kiếm + lọc + sắp xếp ---------- */
  const runSearch = async () => {
    setLoading(true);
    let query = supabase
      .from('apps')
      .select('*')
      .order(sortBy, { ascending: sortBy === 'name' });

    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);

    const { data } = await query;
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => { if (searchOpen) runSearch(); }, [q, activeCategory, sortBy, searchOpen]);

  const handleAppClick = (slug) => {
    setSearchOpen(false);
    setQ('');
    setCategory('all');
    router.push(`/${slug}`);
  };

  /* ---------- 4. Render ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">

      <Head>
        <title>StreiOS – TestFlight & Jailbreak</title>
        <meta name="description" content="Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS" />
      </Head>

      {/* ---------------- HEADER ---------------- */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
            StreiOS
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/tools"><span className="hover:text-red-600 cursor-pointer flex items-center gap-1"><FontAwesomeIcon icon={faTools} />Công cụ</span></Link>
            <Link href="/categories"><span className="hover:text-red-600 cursor-pointer flex items-center gap-1"><FontAwesomeIcon icon={faLayerGroup} />Chuyên mục</span></Link>
            <Link href="/about"><span className="hover:text-red-600 cursor-pointer flex items-center gap-1"><FontAwesomeIcon icon={faInfoCircle} />Giới thiệu</span></Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- MOBILE MENU ---------------- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-0 right-0 h-full w-72 bg-white dark:bg-gray-800 shadow-xl p-6 space-y-6">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className="text-xl font-bold">Menu</h2>
            <nav className="space-y-4 text-sm font-medium">
              <Link href="/tools"><span onClick={() => setMobileMenuOpen(false)} className="block hover:text-red-600 cursor-pointer">Công cụ</span></Link>
              <Link href="/categories"><span onClick={() => setMobileMenuOpen(false)} className="block hover:text-red-600 cursor-pointer">Chuyên mục</span></Link>
              <Link href="/about"><span onClick={() => setMobileMenuOpen(false)} className="block hover:text-red-600 cursor-pointer">Giới thiệu</span></Link>
            </nav>
            <button onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }} className="w-full bg-red-600 text-white py-2 rounded-lg font-semibold">
              <FontAwesomeIcon icon={faSearch} className="mr-2" />Tìm kiếm
            </button>
          </div>
        </div>
      )}

      {/* ---------------- SEARCH MODAL ---------------- */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
          <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tìm kiếm & lọc</h2>
              <button onClick={() => setSearchOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
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
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-red-500"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
              <div className="flex items-center gap-1">
                <FontAwesomeIcon icon={faFilter} />
                <span>Danh mục:</span>
                <select value={activeCategory} onChange={(e) => setCategory(e.target.value)} className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                  <option value="all">Tất cả</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-1">
                <FontAwesomeIcon icon={faSortAmountDown} />
                <span>Sắp xếp:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
                  <option value="created_at">Mới nhất</option>
                  <option value="name">Tên A-Z</option>
                </select>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {loading && <p className="text-center py-4 text-gray-500">Đang tìm...</p>}
              {!loading && !apps.length && <p className="text-center py-4 text-gray-500">Không có kết quả.</p>}
              <ul className="space-y-2">
                {apps.map(app => (
                  <li key={app.id} onClick={() => handleAppClick(app.slug)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                    <img src={app.icon_url || '/placeholder-icon.png'} alt={app.name} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="font-semibold">{app.name}</p>
                      <p className="text-xs text-gray-500">{app.author}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MAIN ---------------- */}
      <main className={`flex-1 ${fullWidth ? '' : 'max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8 text-sm">
          <div>
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
              StreiOS
            </Link>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS.
            </p>
            <button onClick={() => setDarkMode(!darkMode)} className="mt-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
            </button>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Khám phá</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link href="/tools"><span className="hover:text-red-600 cursor-pointer">Công cụ</span></Link></li>
              <li><Link href="/categories"><span className="hover:text-red-600 cursor-pointer">Chuyên mục</span></Link></li>
              <li><Link href="/about"><span className="hover:text-red-600 cursor-pointer">Giới thiệu</span></Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Chuyên mục</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              {categories.slice(0, 5).map(c => (
                <li key={c.id}><Link href={`/category/${c.id}`}><span className="hover:text-red-600 cursor-pointer">{c.name} ({c.apps?.count || 0})</span></Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Hỗ trợ</h3>
            <ul className="space-y-2 text-gray-600 dark:text-gray-400">
              <li><Link href="/contact"><span className="hover:text-red-600 cursor-pointer">Liên hệ</span></Link></li>
              <li><Link href="/terms"><span className="hover:text-red-600 cursor-pointer">Điều khoản</span></Link></li>
              <li><Link href="/privacy"><span className="hover:text-red-600 cursor-pointer">Bảo mật</span></Link></li>
            </ul>
            <button onClick={() => window.open('https://www.buymeacoffee.com', '_blank')} className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700">
              ☕ Ủng hộ
            </button>
          </div>
        </div>
        <div className="border-t border-gray-200 dark:border-gray-700 py-6 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} StreiOS – Made with ❤️ for the iOS community.
        </div>
      </footer>
    </div>
  );
}
