import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import AppCard from './AppCard';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searching, setSearching] = useState(false);

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
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors">
      <Head>
        <title>TestFlight Share</title>
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-800 shadow">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="text-xl font-bold">
            <span className="bg-gradient-to-r from-green-700 via-green-500 to-green-300 bg-clip-text text-transparent">
              TestFlight Share
            </span>
          </Link>

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tools"><a className="hover:text-green-600">Công cụ</a></Link>
            <Link href="/categories"><a className="hover:text-green-600">Chuyên mục</a></Link>
            <Link href="/about"><a className="hover:text-green-600">Giới thiệu</a></Link>
          </nav>

          {/* Right: Search + Theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
              title="Đổi giao diện"
            >
              {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>

            <button
              className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-gray-800 px-4 pb-4 space-y-3">
            <Link href="/tools"><a className="block py-1">Công cụ</a></Link>
            <Link href="/categories"><a className="block py-1">Chuyên mục</a></Link>
            <Link href="/about"><a className="block py-1">Giới thiệu</a></Link>
            <form onSubmit={handleSearch} className="flex flex-col gap-2 mt-3">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm app..."
                className="px-3 py-2 rounded-lg border bg-gray-50 dark:bg-gray-700"
              />
              <select
                value={activeCategory}
                onChange={(e) => handleCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border bg-white dark:bg-gray-700"
              >
                <option value="all">Tất cả</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
              >
                Tìm kiếm
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Kết quả tìm kiếm */}
      {searching ? (
        <div className="max-w-screen-2xl mx-auto px-4 py-6 text-center text-gray-500">Đang tìm kiếm...</div>
      ) : apps.length > 0 ? (
        <div className="max-w-screen-2xl mx-auto px-4 py-6">
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
        <div className="max-w-screen-2xl mx-auto px-4 py-6 text-center text-gray-500">
          Không tìm thấy ứng dụng phù hợp.
        </div>
      ) : null}

      {/* Nội dung trang */}
      <main className={`${fullWidth ? 'w-full px-0' : 'max-w-screen-2xl mx-auto px-4'} py-6 flex-1`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 text-sm py-10 mt-10">
        <div className="max-w-screen-2xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-gray-600 dark:text-gray-400">
          {/* Cột 1 */}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Về chúng tôi</h3>
            <ul className="space-y-1">
              <li><Link href="/about">Giới thiệu</Link></li>
              <li><Link href="/contact">Liên hệ</Link></li>
              <li><Link href="/terms">Điều khoản</Link></li>
            </ul>
          </div>

          {/* Cột 2 */}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Danh mục</h3>
            <ul className="space-y-1">
              {categories.slice(0, 5).map((cat) => (
                <li key={cat.id}>
                  <Link href={`/category/${cat.id}`}>{cat.name}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Cột 3 */}
          <div>
            <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Ủng hộ dự án</h3>
            <p className="mb-2">Nếu bạn thấy dự án hữu ích, hãy ủng hộ chúng tôi qua:</p>
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

        <div className="text-center text-xs text-gray-500 mt-6">
          © {new Date().getFullYear()} TestFlight Share. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12.79A9 9 0 0112.21 3 7 7 0 0012 21a9 9 0 009-8.21z" />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36l-.71-.71M6.34 6.34l-.71-.71M17.66 6.34l-.71.71M6.34 17.66l-.71.71M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

function MenuIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}