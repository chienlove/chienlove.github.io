// pages/index.js
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import { useState } from 'react';

export default function Home({ initialApps, categoriesWithApps }) {
  const [apps, setApps] = useState(initialApps);
  const [q, setQ] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  async function handleSearch(e) {
    e.preventDefault();
    let query = supabase
      .from('apps')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('created_at', { ascending: false });

    if (activeCategory !== 'all') {
      query = query.eq('category_id', activeCategory);
    }

    const { data } = await query;
    setApps(data || []);
  }

  async function filterByCategory(categoryId) {
    setActiveCategory(categoryId);
    let query = supabase
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false });

    if (categoryId !== 'all') {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query;
    setApps(data || []);
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-16 text-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Kho ứng dụng di động</h1>
            <p className="text-xl md:text-2xl mb-8">Khám phá những ứng dụng hữu ích nhất</p>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="relative">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Tìm kiếm ứng dụng..."
                  className="w-full py-4 px-6 rounded-full shadow-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <button 
                  type="submit"
                  className="absolute right-2 top-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-full transition duration-200"
                >
                  Tìm kiếm
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Main Content */}
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Categories Sidebar */}
            <div className="lg:w-1/4">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-white">Chuyên mục</h2>
                <ul className="space-y-2">
                  <li>
                    <button
                      onClick={() => filterByCategory('all')}
                      className={`w-full text-left px-4 py-2 rounded-lg transition ${activeCategory === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                    >
                      Tất cả ứng dụng
                    </button>
                  </li>
                  {categoriesWithApps.map((category) => (
                    <li key={category.id}>
                      <button
                        onClick={() => filterByCategory(category.id)}
                        className={`w-full text-left px-4 py-2 rounded-lg transition ${activeCategory === category.id ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                      >
                        {category.name} ({category.app_count})
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Apps List */}
            <div className="lg:w-3/4">
              {/* Category Title (only shown when filtered) */}
              {activeCategory !== 'all' && (
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                    {categoriesWithApps.find(c => c.id === activeCategory)?.name}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {apps.length} ứng dụng trong chuyên mục này
                  </p>
                </div>
              )}

              {/* Apps Grid */}
              {apps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {apps.map((app) => (
                    <AppCard key={app.id} app={app} />
                  ))}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-8 text-center">
                  <div className="text-gray-400 dark:text-gray-500 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">Không tìm thấy ứng dụng</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {q ? `Không có kết quả phù hợp với "${q}"` : 'Chưa có ứng dụng nào trong chuyên mục này'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  // Fetch all apps
  const { data: apps } = await supabase
    .from('apps')
    .select('*')
    .order('created_at', { ascending: false });

  // Fetch categories with app counts
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name');

  // Calculate app count for each category
  const categoriesWithApps = await Promise.all(
    categories.map(async (category) => {
      const { count } = await supabase
        .from('apps')
        .select('*', { count: 'exact' })
        .eq('category_id', category.id);
      
      return {
        ...category,
        app_count: count || 0
      };
    })
  );

  // Only show categories that have apps
  const filteredCategories = categoriesWithApps.filter(c => c.app_count > 0);

  return { 
    props: { 
      initialApps: apps || [],
      categoriesWithApps: filteredCategories
    } 
  };
}