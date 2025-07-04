import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import AppCard from './AppCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faMoon, faSun, faTools, faThList, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    async function fetchCategories() {
      const { data } = await supabase.from('categories').select('*');
      setCategories(data || []);
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    if (q.length >= 2) {
      supabase
        .from('apps')
        .select('id, name, slug')
        .ilike('name', `%${q}%`)
        .then(({ data }) => setSearchSuggestions(data || []));
    } else {
      setSearchSuggestions([]);
    }
  }, [q]);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    let query = supabase.from('apps').select('*').order('created_at', { ascending: false });
    if (q) query = query.ilike('name', `%${q}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);
    const { data } = await query;
    setApps(data || []);
    setSearching(false);
  };

  const handleCategory = async (id) => {
    setActiveCategory(id);
    setSearching(true);
    let query = supabase.from('apps').select('*').order('created_at', { ascending: false });
    if (q) query = query.ilike('name', `%${q}%`);
    if (id !== 'all') query = query.eq('category_id', id);
    const { data } = await query;
    setApps(data || []);
    setSearching(false);
  };

  const handleAppClick = (slug) => {
    setApps([]);
    setQ('');
    setActiveCategory('all');
    setSearchSuggestions([]);
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      <Head>
        <title>StreiOS - Chia sẻ ứng dụng testflight beta và tool jailbreak cho iOS</title>
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-800 shadow">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
  <span className="bg-gradient-to-r from-green-700 via-green-500 to-green-300 bg-clip-text text-transparent animate-gradient-x">
    StreiOS
  </span>
         </Link>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tools">
              <a className="hover:text-green-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faTools} /> Công cụ
              </a>
            </Link>

            <div className="relative group">
              <button className="hover:text-green-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faThList} /> Chuyên mục
              </button>
              <div className="absolute hidden group-hover:block bg-white dark:bg-gray-800 shadow rounded w-48 mt-2 z-50">
                {categories.map((cat) => (
                  <Link key={cat.id} href={`/category/${cat.id}`}>
                    <a className="block px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700">{cat.name}</a>
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/about">
              <a className="hover:text-green-600 flex items-center gap-1">
                <FontAwesomeIcon icon={faInfoCircle} /> Giới thiệu
              </a>
            </Link>
          </nav>

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Đổi giao diện"
            >
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>

            <button
              className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Slide menu mobile */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-800 shadow-lg z-50 transform transition-transform duration-300 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <span className="font-bold text-lg">Menu</span>
          <button onClick={() => setMobileMenuOpen(false)}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <Link href="/tools"><a className="block">🛠 Công cụ</a></Link>
          <Link href="/about"><a className="block">ℹ️ Giới thiệu</a></Link>
          <div>
            <p className="font-semibold mb-1">Chuyên mục</p>
            {categories.map((cat) => (
              <Link key={cat.id} href={`/category/${cat.id}`}>
                <a className="block text-sm pl-2 py-1">{cat.name}</a>
              </Link>
            ))}
          </div>
          <form onSubmit={handleSearch} className="flex flex-col gap-2 mt-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm app..."
              className="px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-700"
            />
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </div>

      {/* Gợi ý tìm kiếm */}
      {q.length >= 2 && searchSuggestions.length > 0 && (
        <div className="absolute z-50 top-[60px] left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white dark:bg-gray-800 shadow rounded">
          {searchSuggestions.map((app) => (
            <div
              key={app.id}
              className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              onClick={() => handleAppClick(app.slug)}
            >
              {app.name}
            </div>
          ))}
        </div>
      )}

      {/* Kết quả tìm kiếm */}
      {searching ? (
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-6 text-center text-gray-500">
          Đang tìm kiếm...
        </div>
      ) : apps.length > 0 ? (
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-6">
          <div className="text-sm text-gray-500 mb-3">Đã tìm thấy {apps.length} ứng dụng</div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <div key={app.id} onClick={() => handleAppClick(app.slug)} className="cursor-pointer">
                <AppCard app={app} />
              </div>
            ))}
          </div>
        </div>
      ) : q || activeCategory !== 'all' ? (
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-6 text-center text-gray-500">
          Không tìm thấy ứng dụng phù hợp.
        </div>
      ) : null}

      {/* Main content */}
      <main className={`${fullWidth ? 'w-full px-0' : 'w-full max-w-screen-2xl mx-auto px-4'} py-6 flex-1`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-100 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-600 dark:text-gray-400">
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Về chúng tôi</h3>
            <ul className="space-y-1">
              <li><Link href="/about">Giới thiệu</Link></li>
              <li><Link href="/contact">Liên hệ</Link></li>
              <li><Link href="/terms">Điều khoản</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Danh mục</h3>
            <ul className="space-y-1">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}><Link href={`/category/${cat.id}`}>{cat.name}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Ủng hộ dự án</h3>
            <p className="mb-2">Nếu bạn thấy dự án hữu ích, hãy ủng hộ chúng tôi:</p>
            <a
              href="https://www.buymeacoffee.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 font-semibold text-sm"
            >
              ☕ Buy Me a Coffee
            </a>
          </div>
        </div>
        <div className="text-center text-xs text-gray-500 mt-6 pb-4">
          © {new Date().getFullYear()} TestFlight Share. All rights reserved.
        </div>
      </footer>
    </div>
  );
}