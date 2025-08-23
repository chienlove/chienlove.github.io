import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Script from 'next/script';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import SearchModal from './SearchModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun, faMoon, faSearch, faBars, faTimes,
  faTools, faLayerGroup, faChevronDown, faChevronUp,
  faCode, faLock, faRocket
} from '@fortawesome/free-solid-svg-icons';
import {
  faGithub, faTwitter, faDiscord, faTelegram
} from '@fortawesome/free-brands-svg-icons';

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
  const menuRef = useRef(null); 

  const [accordionOpen, setAccordionOpen] = useState({
    tools: true,
    categories: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem('darkMode');
    const prefers = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(stored ? stored === 'true' : prefers);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
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

    if (q.trim()) {
  query = query.or(`name.ilike.%${q.trim()}%,author.ilike.%${q.trim()}%`);
}
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);

    const { data } = await query;
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (searchOpen) runSearch();
  }, [q, activeCategory, sortBy, searchOpen]);

  // Auto-close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    }
    if (mobileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
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
          {/* Hamburger */}
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 md:hidden">
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </button>

          {/* Logo */}
          <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
            StoreiOS
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSearchOpen(true)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            </button>
            <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex">
          <div ref={menuRef} className="w-72 bg-white dark:bg-gray-900 p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* TOOLS ACCORDION */}
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

            {/* CATEGORIES ACCORDION */}
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

      {/* MAIN CONTENT */}
      <main className={`flex-1 ${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      {/* FOOTER (chuyên nghiệp – giữ như bản trước) */}
      <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">StreiOS</h3>
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
            <div className="flex gap-4 text-xl">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FontAwesomeIcon icon={faGithub} /></a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FontAwesomeIcon icon={faTwitter} /></a>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FontAwesomeIcon icon={faDiscord} /></a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-white"><FontAwesomeIcon icon={faTelegram} /></a>
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 border-t border-gray-800 py-6">
          © {new Date().getFullYear()} StoreiOS – Made with ❤️ for the iOS community.
        </div>
      </footer>
    </div>
  );
}