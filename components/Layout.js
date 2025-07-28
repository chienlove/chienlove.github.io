import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import SearchModal from './SearchModal';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faSun, faMoon, faSearch,
  faTools, faLayerGroup, faInfoCircle, faTimes
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

      {/* Header */}
      <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold bg-gradient-to-r from-red-600 via-black to-red-600 dark:from-red-400 dark:via-white dark:to-red-400 bg-clip-text text-transparent">
            StreiOS
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <Link href="/tools" className="hover:text-red-600 flex items-center gap-1"><FontAwesomeIcon icon={faTools} />Công cụ</Link>
            <Link href="/categories" className="hover:text-red-600 flex items-center gap-1"><FontAwesomeIcon icon={faLayerGroup} />Chuyên mục</Link>
            <Link href="/about" className="hover:text-red-600 flex items-center gap-1"><FontAwesomeIcon icon={faInfoCircle} />Giới thiệu</Link>
          </nav>
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-xl p-6">
            <button onClick={() => setMobileMenuOpen(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <h2 className="text-xl font-bold mb-4">Menu</h2>
            <nav className="space-y-4 text-sm font-medium">
              <Link href="/tools" onClick={() => setMobileMenuOpen(false)}>Công cụ</Link>
              <Link href="/categories" onClick={() => setMobileMenuOpen(false)}>Chuyên mục</Link>
              <Link href="/about" onClick={() => setMobileMenuOpen(false)}>Giới thiệu</Link>
              <button onClick={() => { setMobileMenuOpen(false); setSearchOpen(true); }} className="mt-4 w-full bg-red-600 text-white py-2 rounded-lg font-semibold">
                <FontAwesomeIcon icon={faSearch} className="mr-2" />Tìm kiếm
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Search Modal */}
      <SearchModal
        q={q} setQ={setQ}
        activeCategory={activeCategory} setCategory={setCategory}
        sortBy={sortBy} setSortBy={setSortBy}
        apps={apps} loading={loading}
        searchOpen={searchOpen} setSearchOpen={setSearchOpen}
        categories={categories}
      />

      {/* Main */}
      <main className={`flex-1 ${fullWidth ? '' : 'w-full max-w-screen-2xl mx-auto px-4 py-6'}`}>
        {children}
      </main>

      {/* Footer mới */}
      <footer className="bg-gray-900 text-gray-200 mt-12">
        <div className="max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-white">StreiOS</h2>
            <p className="mt-2 text-gray-400">Kho ứng dụng TestFlight beta và công cụ jailbreak dành cho iOS.</p>
            <button onClick={() => setDarkMode(!darkMode)} className="mt-4 p-2 rounded-full hover:bg-gray-800 border border-gray-700">
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
            </button>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-white">Khám phá</h3>
            <ul className="space-y-2">
              <li><Link href="/tools" className="hover:text-red-400">Công cụ</Link></li>
              <li><Link href="/categories" className="hover:text-red-400">Chuyên mục</Link></li>
              <li><Link href="/about" className="hover:text-red-400">Giới thiệu</Link></li>
              <li><Link href="/privacy" className="hover:text-red-400">Bảo mật</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-3 text-white">Ủng hộ</h3>
            <p className="text-gray-400 mb-4">Nếu bạn thấy hữu ích, hãy ủng hộ chúng tôi một ly cà phê!</p>
            <button onClick={() => window.open('https://www.buymeacoffee.com', '_blank')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold">
              ☕ Ủng hộ qua BuyMeACoffee
            </button>
          </div>
        </div>
        <div className="text-center text-sm text-gray-500 border-t border-gray-800 py-6">
          © {new Date().getFullYear()} StreiOS – Made with ❤️ for the iOS community.
        </div>
      </footer>
    </div>
  );
}