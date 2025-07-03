// components/Layout.js
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
      <Head>
        <title>TestFlight Share</title>
      </Head>

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3">
            <Link href="/">
              <a className="text-2xl font-bold text-blue-600 dark:text-blue-400">🚀 TestFlight Share</a>
            </Link>

            <form onSubmit={handleSearch} className="flex-1 flex flex-col md:flex-row items-stretch gap-2 w-full">
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Tìm kiếm ứng dụng..."
                className="flex-1 px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 text-sm"
              />
              <select
                value={activeCategory}
                onChange={(e) => handleCategory(e.target.value)}
                className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-800 dark:text-white"
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
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full text-sm font-semibold"
              >
                Tìm kiếm
              </button>
            </form>

            <button
              onClick={() => setDarkMode(!darkMode)}
              title="Chuyển giao diện"
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {darkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

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

      {/* Nội dung chính */}
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

// Icons
function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
      />
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}