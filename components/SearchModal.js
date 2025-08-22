
'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Filter, ListFilter } from 'lucide-react'; // Sử dụng Lucide Icons
import AppCard from './AppCard'; // Sử dụng lại AppCard để hiển thị kết quả

// Component con cho Filter Pills
const FilterPill = ({ children, active, onClick }) => (
  <button
    onClick={onClick}
    className={`
      px-4 py-2 rounded-full text-sm font-medium transition-all duration-200
      ${active
        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-md'
        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
      }
    `}
  >
    {children}
  </button>
);

// Component con cho Search Result Item (sử dụng AppCard)
const SearchResultItem = ({ app, onClick }) => (
  <li onClick={onClick} className="cursor-pointer">
    <AppCard app={app} mode="list" />
  </li>
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
  apps, loading, searchOpen, setSearchOpen, categories
}) {
  const router = useRouter();

  const handleAppClick = (slug) => {
    setSearchOpen(false);
    setQ(''); // Reset query khi đóng modal
    setCategory('all'); // Reset category khi đóng modal
    router.push(`/${slug}`);
  };

  // Đóng modal khi nhấn ESC
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
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-md"
            onClick={() => setSearchOpen(false)}
          ></div>

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: -20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: -20 }}
            className="relative w-full max-w-4xl"
          >
            {/* Glassmorphism Container */}
            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl 
                           rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/30
                           overflow-hidden">
              
              {/* Header */}
              <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 
                                bg-clip-text text-transparent">
                    Tìm kiếm ứng dụng
                  </h2>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-200/50 dark:hover:bg-gray-700/50
                               transition-colors duration-200"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                {/* Enhanced Search Input */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Tìm kiếm ứng dụng, tác giả, hoặc mô tả..."
                    className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl
                             bg-gray-50/50 dark:bg-gray-800/50 
                             border-2 border-transparent
                             focus:border-blue-500 focus:bg-white dark:focus:bg-gray-800
                             transition-all duration-300 placeholder-gray-400"
                  />
                </div>
              </div>
              
              {/* Filters */}
              <div className="px-6 py-4 bg-gray-50/30 dark:bg-gray-800/30 flex flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Danh mục:</span>
                  <select value={activeCategory} onChange={(e) => setCategory(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm">
                    <option value="all">Tất cả</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sắp xếp:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1 text-sm">
                    <option value="created_at">Mới nhất</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                </div>
              </div>
              
              {/* Results */}
              <div className="p-6 max-h-96 overflow-y-auto">
                {q.trim() === '' ? (
                  <p className="text-center py-4 text-gray-500">
                    Nhập từ khóa để tìm kiếm ứng dụng...
                  </p>
                ) : loading ? (
                  <SearchSkeleton />
                ) : !apps.length ? (
                  <p className="text-center py-4 text-gray-500">Không có kết quả cho "{q}".</p>
                ) : (
                  <ul className="space-y-3">
                    {apps.map(app => (
                      <SearchResultItem key={app.id} app={app} onClick={() => handleAppClick(app.slug)} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


