'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, ListFilter, Sparkles, Flame } from 'lucide-react';
import AppCard from './AppCard';

// Component con cho Filter Pills
const FilterPill = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
      ${active
        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
      }
    `}
  >
    {children}
  </button>
);

// Component con cho Search Result Item (sử dụng AppCard)
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

// Skeleton Loading cho Search Results
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
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          ></motion.div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            className="relative w-full max-w-xl" // Giảm kích thước modal
          >
            {/* Glassmorphism Container */}
            <div className="bg-white/75 dark:bg-gray-900/75 backdrop-blur-xl 
                           rounded-2xl shadow-2xl border border-white/50 dark:border-gray-700/70
                           overflow-hidden">
              
              {/* Header */}
              <div className="p-5 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    Tìm kiếm ứng dụng
                  </h2>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-1.5 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                               transition-colors duration-200"
                  >
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
                
                {/* Enhanced Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm kiếm ứng dụng..."
                    className="w-full pl-9 pr-3 py-2.5 text-base rounded-lg
                             bg-gray-50/50 dark:bg-gray-800/50 
                             border border-gray-300 dark:border-gray-600
                             focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800
                             transition-all duration-200 placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="px-5 py-3 bg-gray-50/30 dark:bg-gray-800/30 flex flex-wrap gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-700 dark:text-gray-300">Danh mục:</span>
                  <select value={activeCategory} onChange={(e) => setCategory(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm">
                    <option value="all">Tất cả</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)} 
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <ListFilter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sắp xếp:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm">
                    <option value="created_at">Mới nhất</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>
              </div>
              
              {/* Results */}
              <div className="p-5 max-h-96 overflow-y-auto">
                {q.trim() === '' ? (
                  <div className="text-center py-4 text-gray-500 flex flex-col items-center justify-center">
                    <Sparkles className="w-10 h-10 text-blue-400 mb-2 animate-pulse" />
                    <p className="text-base font-semibold mb-1 text-gray-800 dark:text-gray-200">Bắt đầu tìm kiếm của bạn</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Nhập từ khóa để khám phá các ứng dụng tuyệt vời!</p>
                    
                    {/* Hot Apps / Trending Searches */}
                    {hotApps && hotApps.length > 0 && (
                      <div className="mt-6 w-full max-w-xs">
                        <h3 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center justify-center gap-2">
                          <Flame className="w-4 h-4 text-red-500" />
                          Ứng dụng Hot
                        </h3>
                        <div className="flex flex-wrap justify-center gap-2">
                          {hotApps.map(app => (
                            <FilterPill key={app.id} onClick={() => handleHotAppClick(app.name)}>
                              {app.name}
                            </FilterPill>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <SearchSkeleton />
                ) : apps.length === 0 ? (
                  <p className="text-center py-4 text-gray-500">Không có kết quả cho "{q}".</p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Tìm thấy <span className="font-bold text-blue-600">{apps.length}</span> kết quả cho "<span className="font-bold text-gray-800 dark:text-gray-200">{q}</span>":
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