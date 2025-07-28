import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import SearchModal from './SearchModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSun, faMoon, faSearch
} from '@fortawesome/free-solid-svg-icons';
import {
  faGithub, faTwitter, faDiscord, faTelegram
} from '@fortawesome/free-brands-svg-icons';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [activeCategory, setCategory] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

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

    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);

    const { data } = await query;
    setApps(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (searchOpen) runSearch();
  }, [q, activeCategory, sortBy, searchOpen]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Head>
        <title>StreiOS – TestFlight & Jailbreak</title>
        <meta name="description" content="Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS" />
      </Head>

      {/* HEADER mới */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* LEFT: Menu */}
          <nav className="flex items-center gap-6 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Link href="/tools" className="hover:text-red-600 transition">Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600 transition">Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600 transition">Giới thiệu</Link>
          </nav>

          {/* CENTER: Logo */}
          <Link href="/" className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
            StreiOS
          </Link>

          {/* RIGHT: Search & Dark mode */}
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

      {/* SEARCH MODAL */}
      <SearchModal
        q={q} setQ={setQ}
        activeCategory={activeCategory} setCategory={setCategory}
        sortBy={sortBy} setSortBy={setSortBy}
        apps={apps} loading={loading}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        categories={categories}
      />

      {/* MAIN */}
      <main className={`flex-1 ${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      {/* FOOTER mới */}
      <footer className="bg-gray-900 text-gray-300 mt-16 border-t border-gray-800">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

          {/* Về StreiOS */}
          <div>
            <h3 className="text-white font-bold text-lg mb-3">StreiOS</h3>
            <p className="text-gray-400 text-sm">
              Kho ứng dụng TestFlight beta & công cụ jailbreak cho cộng đồng iOS.
            </p>
          </div>

          {/* Điều hướng */}
          <div>
            <h4 className="font-semibold text-white mb-3">Điều hướng</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/tools" className="hover:text-white">Công cụ</Link></li>
              <li><Link href="/categories" className="hover:text-white">Chuyên mục</Link></li>
              <li><Link href="/about" className="hover:text-white">Giới thiệu</Link></li>
              <li><Link href="/privacy" className="hover:text-white">Bảo mật</Link></li>
            </ul>
          </div>

          {/* Liên hệ */}
          <div>
            <h4 className="font-semibold text-white mb-3">Liên hệ</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/contact" className="hover:text-white">Liên hệ trực tiếp</Link></li>
              <li><a href="mailto:support@storeios.net" className="hover:text-white">Email hỗ trợ</a></li>
            </ul>
          </div>

          {/* Mạng xã hội */}
          <div>
            <h4 className="font-semibold text-white mb-3">Kết nối</h4>
            <div className="flex gap-4 text-xl">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                <FontAwesomeIcon icon={faGithub} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                <FontAwesomeIcon icon={faTwitter} />
              </a>
              <a href="https://discord.gg" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                <FontAwesomeIcon icon={faDiscord} />
              </a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                <FontAwesomeIcon icon={faTelegram} />
              </a>
            </div>
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 border-t border-gray-800 py-6">
          © {new Date().getFullYear()} StreiOS – Made with ❤️ for the iOS community.
        </div>
      </footer>
    </div>
  );
}