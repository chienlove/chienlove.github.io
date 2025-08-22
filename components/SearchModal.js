'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ChevronDown, Flame } from 'lucide-react';
import AppCard from './AppCard';

// Component cho Hot App Item
const HotAppItem = ({ app, onClick }) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    onClick={() => onClick(app.name)}
    className="flex flex-col items-center cursor-pointer group"
  >
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 
                    flex items-center justify-center text-white text-2xl font-bold
                    shadow-lg group-hover:shadow-xl transition-all duration-200">
      {app.name.charAt(0)}
    </div>
    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-2 text-center">
      {app.name}
    </span>
  </motion.div>
);

// Component cho Search Result Item
const SearchResultItem = ({ app, onClick }) => (
  <motion.li
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.3 }}
    onClick={onClick}
    className="cursor-pointer"
  >
    <AppCard app={app} mode="list" />
  </motion.li>
);

// Skeleton Loading
const SearchSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse">
        <div className="w-10 h-10 rounded-lg bg-gray-300 dark:bg-gray-600"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
    ))}
  </div>
);

export default function SearchModal({
  q, setQ, activeCategory, setCategory, sortBy, setSortBy,
  apps, loading, searchOpen, setSearchOpen, categories, hotApps
}) {
  const router = useRouter();

  const handleAppClick = (slug) => {
    setSearchOpen(false);
    setQ('');
    setCategory('all');
    router.push(`/${slug}`);
  };

  const handleHotAppClick = (appName) => {
    setQ(appName);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    if (searchOpen) {
      document.addEventListener('keydown', handleKeyDown);
    } else {
      document.removeEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  return (
    <AnimatePresence>
      {searchOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4"
        >
          {/* Backdrop với hiệu ứng blur mạnh */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/40 to-pink-900/40 backdrop-blur-lg"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: -20, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-lg"
          >
            {/* Glassmorphism Container */}
            <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl 
                           rounded-3xl shadow-2xl border border-white/30 dark:border-gray-700/50
                           overflow-hidden">
              
              {/* Header với gradient */}
              <div className="p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-900/20 dark:to-purple-900/20">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                                bg-clip-text text-transparent">
                    Tìm kiếm ứng dụng
                  </h2>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2 rounded-full hover:bg-white/50 dark:hover:bg-gray-700/50
                               transition-all duration-200"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                {/* Search Input với hiệu ứng đẹp */}
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <Search className="w-5 h-5 text-teal-500" />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search"
                    className="w-full pl-12 pr-16 py-3 text-base rounded-2xl
                             bg-white/70 dark:bg-gray-800/70 
                             border-2 border-teal-200 dark:border-teal-700
                             focus:border-teal-400 focus:ring-2 focus:ring-teal-200 
                             focus:bg-white dark:focus:bg-gray-800
                             transition-all duration-300 placeholder-gray-500"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <div className="bg-teal-500 text-white p-2 rounded-xl">
                      <Search className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Filters với style pill */}
              <div className="px-6 py-3 bg-gray-50/50 dark:bg-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <select 
                    value={activeCategory} 
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-white/80 dark:bg-gray-700/80 rounded-full px-4 py-2 text-sm
                             border border-gray-200 dark:border-gray-600 
                             focus:border-blue-400 focus:ring-1 focus:ring-blue-200
                             appearance-none cursor-pointer"
                  >
                    <option value="all">Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)} 
                  </select>
                  
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/80 dark:bg-gray-700/80 rounded-full px-4 py-2 text-sm
                             border border-gray-200 dark:border-gray-600 
                             focus:border-blue-400 focus:ring-1 focus:ring-blue-200
                             appearance-none cursor-pointer"
                  >
                    <option value="created_at">Sort By</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
              
              {/* Results */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {q.trim() === '' ? (
                  <div className="text-center">
                    {/* Hot Apps Section */}
                    {hotApps && hotApps.length > 0 && (
                      <div className="mb-6">
                        <div className="flex items-center justify-center gap-2 mb-4">
                          <Flame className="w-5 h-5 text-teal-500" />
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            Hot Apps
                          </h3>
                        </div>
                        <div className="grid grid-cols-5 gap-4">
                          {hotApps.slice(0, 5).map(app => (
                            <HotAppItem key={app.id} app={app} onClick={handleHotAppClick} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <SearchSkeleton />
                ) : apps.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-lg mb-2">😔</div>
                    <p className="text-gray-500">Không có kết quả cho "{q}"</p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Tìm thấy <span className="font-bold text-teal-600">{apps.length}</span> kết quả cho 
                      "<span className="font-bold text-gray-800 dark:text-gray-200">{q}</span>":
                    </p>
                    <ul className="space-y-2">
                      <AnimatePresence>
                        {apps.map(app => (
                          <SearchResultItem key={app.id} app={app} onClick={() => handleAppClick(app.slug)} />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}