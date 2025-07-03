import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { supabase } from '../lib/supabase';
import AppCard from './AppCard';

export default function Layout({ children }) {
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
      <Head>
        <title>TestFlight Share</title>
      </Head>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
  <div className="container mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
    {/* Logo */}
    <div className="flex items-center justify-between w-full md:w-auto">
      <Link href="/">
        <a className="text-xl font-bold text-blue-600 dark:text-blue-400">🚀 TestFlight Share</a>
      </Link>

      {/* Mobile menu button */}
      <button
        className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        <MenuIcon className="w-6 h-6" />
      </button>
    </div>

    {/* Tìm kiếm gọn đẹp */}
    <form
      onSubmit={handleSearch}
      className="flex flex-wrap gap-2 items-center justify-start md:justify-end w-full md:w-auto"
    >
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Tìm ứng dụng..."
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 md:w-56"
      />
      <select
        value={activeCategory}
        onChange={(e) => handleCategory(e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white"
      >
        <option value="all">Tất cả chuyên mục</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
      >
        Tìm
      </button>
    </form>

    {/* Dark mode toggle */}
    <button
      onClick={() => setDarkMode(!darkMode)}
      title="Chuyển giao diện"
      className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
    >
      {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
    </button>
  </div>

  {/* Mobile menu (dropdown) */}
  {mobileMenuOpen && (
    <div className="md:hidden bg-white dark:bg-gray-800 px-4 py-3 border-t dark:border-gray-700 space-y-2">
      <Link href="/about"><a className="block">Giới thiệu</a></Link>
      <Link href="/contact"><a className="block">Liên hệ</a></Link>
    </div>
  )}
</header>

      {/* Tìm kiếm nâng cao */}
      <section className="bg-gradient-to-r from-blue-500 to-purple-600 py-8 text-white">
        <div className="container mx-auto px-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm ứng dụng..."
              className="flex-1 px-4 py-3 rounded-full text-gray-800 focus:outline-none"
            />
            <select
              value={activeCategory}
              onChange={(e) => handleCategory(e.target.value)}
              className="px-4 py-3 rounded-full text-gray-800"
            >
              <option value="all">Tất cả chuyên mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="bg-white text-blue-600 px-6 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
            >
              Tìm kiếm
            </button>
          </form>
        </div>
      </section>

      {/* Kết quả tìm kiếm */}
      {searching ? (
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400">
          Đang tìm kiếm...
        </div>
      ) : apps.length > 0 ? (
        <div className="container mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <AppCard key={app.id} app={app} />
          ))}
        </div>
      ) : q || activeCategory !== 'all' ? (
        <div className="container mx-auto px-4 py-6 text-center text-gray-600 dark:text-gray-400">
          Không tìm thấy ứng dụng phù hợp
        </div>
      ) : null}

      {/* Nội dung trang con */}
      <main className="container mx-auto px-4 py-8 flex-1">
        {children}
      </main>

      {/* Footer hiện đại */}
      <footer className="bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm mt-auto">
        <div className="container mx-auto px-4 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} TestFlight Share. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/about"><a className="hover:underline">Giới thiệu</a></Link>
            <Link href="/contact"><a className="hover:underline">Liên hệ</a></Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons
function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
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