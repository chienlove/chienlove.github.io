// components/Layout.js
import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import { auth, db } from '../lib/firebase-client';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

import SearchModal from './SearchModal';
import LoginButton from './LoginButton';
import NotificationsPanel from './NotificationsPanel';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faTimes, faSearch, faBell, faWrench, faLayerGroup, faArrowUpRightFromSquare,
  faCog, faBoxOpen, faFolder, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false, hotApps }) {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const drawerRef = useRef(null);

  // ===== Auth state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub && unsub();
  }, []);

  // ===== Admin state (realtime)
  useEffect(() => {
    if (!user) {
      setIsAdmin(false);
      setAdminLoading(false);
      return;
    }
    setAdminLoading(true);
    const ref = doc(db, 'app_config', 'admins');
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const adminUids = snap.exists() ? (snap.data().uids || []) : [];
        setIsAdmin(adminUids.includes(user.uid));
        setAdminLoading(false);
      },
      (err) => {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
        setAdminLoading(false);
      }
    );
    return () => unsub && unsub();
  }, [user]);

  // ===== open notifications from LoginButton
  useEffect(() => {
    const onOpenNoti = () => setNotifOpen(true);
    window.addEventListener('open-notifications', onOpenNoti);
    return () => window.removeEventListener('open-notifications', onOpenNoti);
  }, []);

  // ===== Keyboard: / or ⌘/Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      const isSlash = e.key === '/';
      const isK = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isSlash || isK) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ===== Dark mode
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    const prefers = typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // ===== Categories
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name', { ascending: true });
      setCategories(data || []);
    })();
  }, []);

  // ===== Search dataset
  const runSearch = async () => {
    setLoading(true);
    let queryQ = supabase
      .from('apps')
      .select('*')
      .order(sortBy, { ascending: sortBy === 'name' });
    if (q.trim())
      queryQ = queryQ.or(`name.ilike.%${q.trim()}%,author.ilike.%${q.trim()}%`);
    if (activeCategory !== 'all') queryQ = queryQ.eq('category_id', activeCategory);
    const { data } = await queryQ;
    setApps(data || []);
    setLoading(false);
  };
  useEffect(() => {
    if (searchOpen) runSearch();
  }, [q, activeCategory, sortBy, searchOpen]);

  // ===== Close drawer on outside click
  useEffect(() => {
    const close = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [mobileMenuOpen]);

  // ===== Realtime unread badge
  useEffect(() => {
    let unsubNoti = null;
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (unsubNoti) { unsubNoti(); unsubNoti = null; }
      if (!u) { setNotifCount(0); return; }
      const qn = query(
        collection(db, 'notifications'),
        where('toUserId', '==', u.uid),
        where('isRead', '==', false)
      );
      unsubNoti = onSnapshot(
        qn,
        (snap) => setNotifCount(snap.size),
        () => setNotifCount(0)
      );
    });
    return () => { unsubAuth && unsubAuth(); unsubNoti && unsubNoti(); };
  }, []);

  // ===== Ensure page scroll is never locked accidentally
  useEffect(() => {
    const shouldLock = mobileMenuOpen || searchOpen;
    const prev = document.body.style.overflow;
    document.body.style.overflow = shouldLock ? 'hidden' : '';
    return () => { document.body.style.overflow = prev; };
  }, [mobileMenuOpen, searchOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-gray-900/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Left */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden"
              aria-label="Menu"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>

            <Link
              href="/"
              className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent
                         px-1 rounded active:bg-gray-200 dark:active:bg-gray-800 active:scale-95
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900
                         transition-all duration-150"
              title="Về trang chủ"
              aria-label="Trang chủ StoreiOS"
            >
              StoreiOS
            </Link>
          </div>

          {/* Middle */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/tools" className="hover:text-red-600">Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600">Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600">Giới thiệu</Link>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Search"
              title="Tìm kiếm (/ hoặc Ctrl/⌘+K)"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen(v => !v)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Notifications"
                title="Thông báo"
              >
                <FontAwesomeIcon icon={faBell} className="w-4 h-4" />
                {notifCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
              </button>
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {!adminLoading && isAdmin && (
              <Link
                href={{ pathname: '/admin', query: { tab: 'apps' } }}
                title="Quản trị"
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
              </Link>
            )}

            <LoginButton onToggleTheme={() => setDarkMode(v => !v)} isDark={darkMode} />
          </div>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex">
          <div
            ref={drawerRef}
            className="w-80 max-w-[85%] bg-white dark:bg-gray-900 h-full p-6 shadow-2xl overflow-y-auto"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Tìm kiếm nhanh */}
            <button
              onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-left flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              Tìm kiếm…
            </button>

            {/* === QUẢN TRỊ (Admin only) === */}
            {!adminLoading && isAdmin && (
              <div className="mt-6 mb-4 pb-4 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                  <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                  Quản trị
                </div>
                <div className="space-y-1">
                  <Link
                    href={{ pathname: '/admin', query: { tab: 'apps' } }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FontAwesomeIcon icon={faBoxOpen} className="w-4 h-4" />
                    Quản lý App
                  </Link>
                  <Link
                    href={{ pathname: '/admin', query: { tab: 'categories' } }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FontAwesomeIcon icon={faFolder} className="w-4 h-4" />
                    Chuyên mục
                  </Link>
                  <Link
                    href={{ pathname: '/admin', query: { tab: 'certs' } }}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4" />
                    Ký IPA
                  </Link>
                </div>
              </div>
            )}

            {/* --- Công cụ --- */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faWrench} className="w-4 h-4" />
                Công cụ
              </div>
              <div className="space-y-1">
                <a
                  href="https://appinfo.storeios.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>App Info</span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
                </a>
                <a
                  href="https://ipadl.storeios.net"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <span>IPA Downloader</span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
                </a>
              </div>
            </div>

            {/* --- Chuyên mục --- */}
            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
                Chuyên mục
              </div>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
                {categories.length === 0 && (
                  <div className="px-2 py-2 text-sm text-gray-500">Chưa có chuyên mục</div>
                )}
                {categories.map((c) => {
                  const href = c.slug ? `/category/${c.slug}` : `/category/${c.id}`;
                  return (
                    <Link
                      key={c.id}
                      href={href}
                      onClick={() => setMobileMenuOpen(false)}
                      className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      {c.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 border-t border-gray-200 dark:border-gray-800 pt-4 space-y-2">
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Giới thiệu
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Bảo mật
              </Link>
            </div>
          </div>
          {/* Click overlay to close */}
          <button
            aria-label="Đóng menu"
            className="flex-1"
            onClick={() => setMobileMenuOpen(false)}
          />
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
      <main className={`flex-1 ${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'} overflow-visible`}>
        {children}
      </main>

      {/* FOOTER (compact, professional) */}
      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-screen-2xl mx-auto px-4 py-10">
          {/* Top row: brand + quick nav */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-lg font-bold">
                <span className="bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
                  StoreiOS
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                TestFlight beta & công cụ jailbreak cho cộng đồng iOS.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Link href="/tools" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Công cụ</Link>
              <Link href="/categories" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Chuyên mục</Link>
              <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Giới thiệu</Link>
              <Link href="/privacy" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Bảo mật</Link>
              {/* +++ Added links below +++ */}
              <Link href="/privacy-policy" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Privacy Policy</Link>
              <Link href="/sitemap.xml" className="text-gray-700 dark:text-gray-300 hover:text-red-600">Sitemap</Link>
              {/* +++ End added +++ */}
              <a
                href="mailto:admin@storeios.net"
                className="text-gray-700 dark:text-gray-300 hover:text-red-600"
              >
                Liên hệ
              </a>
              <a
                href="https://appinfo.storeios.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600"
              >
                App Info <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
              </a>
              <a
                href="https://ipadl.storeios.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600"
              >
                IPA Downloader <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
              </a>
            </nav>
          </div>

          {/* Divider */}
          <div className="my-8 border-t border-gray-200 dark:border-gray-800" />

          {/* Bottom row: copyright */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              © {new Date().getFullYear()} StoreiOS -- Made with ❤️ for the iOS community.
            </p>
            <p className="text-xs text-gray-400">
              This site is not affiliated with Apple Inc.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}