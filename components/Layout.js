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
  faBars,
  faTimes,
  faSearch,
  faBell,
  faLayerGroup,
  faArrowUpRightFromSquare,
  faCog,
  faBoxOpen,
  faFolder,
  faShieldAlt,
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false, hotApps, categories = [] }) {
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);

  const [notifOpen, setNotifOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);

  const drawerRef = useRef(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => unsub && unsub();
  }, []);

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
        const adminUids = snap.exists() ? snap.data().uids || [] : [];
        setIsAdmin(adminUids.includes(user.uid));
        setAdminLoading(false);
      },
      () => {
        setIsAdmin(false);
        setAdminLoading(false);
      }
    );
    return () => unsub && unsub();
  }, [user]);

  useEffect(() => {
    const onOpenNoti = () => setNotifOpen(true);
    window.addEventListener('open-notifications', onOpenNoti);
    return () => window.removeEventListener('open-notifications', onOpenNoti);
  }, []);

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

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('darkMode') : null;
    const prefers =
      typeof window !== 'undefined'
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    if (typeof window !== 'undefined') localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  const runSearch = async () => {
    if (!searchOpen) return;

    const term = q.trim();
    const hasCategoryFilter = activeCategory !== 'all';

    if (!term && !hasCategoryFilter) {
      setApps([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (term) params.set('q', term);
      if (hasCategoryFilter) params.set('category', String(activeCategory));
      if (sortBy) params.set('sort', sortBy);

      const res = await fetch(`/api/search?${params}`);
      const json = await res.json();
      setApps(Array.isArray(json.data) ? json.data : []);
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchOpen) runSearch();
  }, [q, activeCategory, sortBy, searchOpen]);

  useEffect(() => {
    const close = (e) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [mobileMenuOpen]);

  useEffect(() => {
    let unsubNoti = null;
    const unsubAuth = auth.onAuthStateChanged((u) => {
      if (unsubNoti) unsubNoti();
      if (!u) {
        setNotifCount(0);
        return;
      }
      const qn = query(
        collection(db, 'notifications'),
        where('toUserId', '==', u.uid),
        where('isRead', '==', false)
      );
      unsubNoti = onSnapshot(qn, (snap) => setNotifCount(snap.size));
    });
    return () => {
      unsubAuth && unsubAuth();
      unsubNoti && unsubNoti();
    };
  }, []);

  useEffect(() => {
    const shouldLock = mobileMenuOpen || searchOpen;
    document.body.style.overflow = shouldLock ? 'hidden' : '';
  }, [mobileMenuOpen, searchOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      <header className="sticky top-0 z-50 w-full bg-white/85 dark:bg-gray-900/85 backdrop-blur border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden"
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>

            <Link
              href="/"
              className="text-xl md:text-2xl font-bold bg-gradient-to-r from-red-500 via-black to-red-500 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent px-1 rounded
              active:scale-95 transition-all"
            >
              StoreiOS
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/tools" className="hover:text-red-600">Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600">Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600">Giới thiệu</Link>
          </nav>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
            </button>

            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
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
                href="/admin"
                className="hidden md:flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
              </Link>
            )}

            <LoginButton onToggleTheme={() => setDarkMode(!darkMode)} isDark={darkMode} />
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex">
          <div ref={drawerRef} className="w-80 max-w-[85%] bg-white dark:bg-gray-900 h-full p-6 shadow-2xl overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchOpen(true);
              }}
              className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-left flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faSearch} className="w-4 h-4" />
              Tìm kiếm…
            </button>

            {!adminLoading && isAdmin && (
              <div className="mt-6 mb-4 pb-4 border-b border-emerald-200 dark:border-emerald-800">
                <div className="flex items-center gap-2 text-sm font-semibold mb-2 text-emerald-600 dark:text-emerald-400">
                  <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                  Quản trị
                </div>
                <div className="space-y-1">
                  <Link href="/admin?tab=apps" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <FontAwesomeIcon icon={faBoxOpen} className="w-4 h-4" /> Quản lý App
                  </Link>
                  <Link href="/admin?tab=categories" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <FontAwesomeIcon icon={faFolder} className="w-4 h-4" /> Chuyên mục
                  </Link>
                  <Link href="/admin?tab=certs" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                    <FontAwesomeIcon icon={faShieldAlt} className="w-4 h-4" /> Ký IPA
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2">
                <FontAwesomeIcon icon={faLayerGroup} className="w-4 h-4" />
                Chuyên mục
              </div>
              <div className="space-y-1 max-h-64 overflow-auto pr-1">
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
              <Link href="/about" onClick={() => setMobileMenuOpen(false)} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                Giới thiệu
              </Link>
              <Link href="/privacy-policy" onClick={() => setMobileMenuOpen(false)} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                Privacy Policy
              </Link>
              <Link href="/terms" onClick={() => setMobileMenuOpen(false)} className="block px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800">
                Điều khoản sử dụng
              </Link>
            </div>
          </div>

          <button className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      <SearchModal
        q={q}
        setQ={setQ}
        activeCategory={activeCategory}
        setCategory={setCategory}
        sortBy={sortBy}
        setSortBy={setSortBy}
        apps={apps}
        loading={loading}
        searchOpen={searchOpen}
        setSearchOpen={setSearchOpen}
        categories={categories}
        hotApps={hotApps}
      />

      <main className={`${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      <footer className="mt-16 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-screen-2xl mx-auto px-4 py-10">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="text-lg font-bold">
                <span className="bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
                  StoreiOS
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                TestFlight, Jailbreak & Công cụ cho cộng đồng iOS.
              </p>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <Link href="/tools" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Công cụ
              </Link>
              <Link href="/categories" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Chuyên mục
              </Link>
              <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Giới thiệu
              </Link>
              <Link href="/privacy-policy" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Điều khoản
              </Link>
              <Link href="/sitemap.xml" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Sitemap
              </Link>
              <a href="mailto:admin@storeios.net" className="text-gray-700 dark:text-gray-300 hover:text-red-600">
                Liên hệ
              </a>

              <a
                href="https://appinfo.storeios.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600"
              >
                App Info
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
              </a>
              <a
                href="https://ipadl.storeios.net"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-red-600"
              >
                IPA Downloader
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="w-3.5 h-3.5 opacity-70" />
              </a>
            </nav>
          </div>

          <div className="my-8 border-t border-gray-200 dark:border-gray-800" />

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
