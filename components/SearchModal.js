// SearchModal.js
'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Import Font Awesome Icons
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch, // Thay thế Search
  faTimes,  // Thay thế X
  faChevronDown, // Thay thế ChevronDown
  faFire,   // Thay thế Flame
  faSort,   // Icon cho Sort By
  faFilter, // Icon cho Category
} from '@fortawesome/free-solid-svg-icons';

import AppCard from './AppCard';

// Component cho Hot App Item (icon_url + tooltip)
const HotAppItem = ({ app, onClick }) => {
  const iconSrc = app.icon_url || null;

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => onClick(app.name)}
      title={app.name} // Tooltip
      className="flex-shrink-0 md:flex-shrink cursor-pointer group"
    >
      <div
        className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden
                   bg-gray-100 dark:bg-gray-700
                   flex items-center justify-center shadow-md
                   group-hover:shadow-lg group-hover:ring-4 group-hover:ring-blue-300/40
                   transition-all duration-300"
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={app.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-500 dark:text-gray-300 text-lg font-bold">
            {app.name.charAt(0)}
          </span>
        )}
      </div>
      <span className="block mt-2 text-xs font-medium text-gray-800 dark:text-gray-200 text-center truncate w-14 md:w-16">
        {app.name}
      </span>
    </motion.div>
  );
};

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
      <div
        key={i}
        className="flex items-center gap-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
      >
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
  q,
  setQ,
  activeCategory,
  setCategory,
  sortBy,
  setSortBy,
  apps,
  loading,
  searchOpen,
  setSearchOpen,
  categories,
  hotApps,
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
          {/* Backdrop (solid, dark, non-blur) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/80 dark:bg-gray-950/90"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-xl"
          >
            <div
              className="bg-white dark:bg-gray-900 
                         rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800
                         overflow-hidden transition-colors duration-300"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
                <div className="flex items-center justify-between">
                  <h2
                    className="text-xl font-bold text-gray-800 dark:text-white"
                  >
                    Tìm kiếm
                  </h2>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700
                               transition-colors duration-200"
                  >
                    <FontAwesomeIcon icon={faTimes} className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Search Input */}
              <div className="p-5 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2">
                    <FontAwesomeIcon icon={faSearch} className="w-5 h-5 text-blue-500" />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nhập tên ứng dụng hoặc từ khóa..."
                    className="w-full pl-12 pr-6 py-3 text-base rounded-lg
                             bg-gray-100 dark:bg-gray-800 
                             border border-gray-300 dark:border-gray-700
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                             transition-all duration-200 placeholder-gray-500 dark:placeholder-gray-400 font-medium"
                  />
                </div>
              </div>


              {/* Filters */}
              <div className="px-5 py-3 flex flex-wrap items-center gap-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
                
                {/* Category Dropdown */}
                <div className="relative inline-block">
                  {/* Icon được đặt cố định */}
                  <FontAwesomeIcon icon={faFilter} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <select
                    value={activeCategory}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-white dark:bg-gray-700 rounded-lg pl-10 pr-10 py-2 text-sm
                             border border-gray-300 dark:border-gray-600 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                             cursor-pointer font-semibold text-gray-800 dark:text-gray-200
                             appearance-none" // Quan trọng: Tắt appearance-none để icon chevron tự nhiên hơn
                  >
                    <option value="all">Tất cả chuyên mục</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {/* Chevron được đặt ngoài <select> và căn chỉnh */}
                  <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

                {/* Sort By Dropdown */}
                <div className="relative inline-block">
                  <FontAwesomeIcon icon={faSort} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white dark:bg-gray-700 rounded-lg pl-10 pr-10 py-2 text-sm
                             border border-gray-300 dark:border-gray-600 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200
                             cursor-pointer font-semibold text-gray-800 dark:text-gray-200
                             appearance-none"
                  >
                    <option value="created_at">Mới nhất</option>
                    <option value="name">Tên A-Z</option>
                  </select>
                  <FontAwesomeIcon icon={faChevronDown} className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>

              </div>

              {/* Results */}
              <div className="p-5 max-h-96 overflow-y-auto">
                {q.trim() === '' ? (
                  <div className="text-center">
                    {hotApps && hotApps.length > 0 && (
                      <div className="mb-8">
                        <div className="flex items-center justify-center gap-2 mb-6">
                          <FontAwesomeIcon icon={faFire} className="w-6 h-6 text-red-500" />
                          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            Ứng dụng nổi bật
                          </h3>
                        </div>
                        <div className="overflow-x-auto md:overflow-visible">
                          <div className="flex md:grid md:grid-cols-5 gap-5 px-2 md:px-0 justify-center">
                            {hotApps.slice(0, 10).map((app) => (
                              <HotAppItem
                                key={app.id}
                                app={app}
                                onClick={handleHotAppClick}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : loading ? (
                  <SearchSkeleton />
                ) : apps.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-3xl mb-2">😔</div>
                    <p className="text-gray-500 dark:text-gray-400">
                      Không có kết quả nào phù hợp với "<span className="font-semibold">{q}</span>"
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Tìm thấy{' '}
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {apps.length}
                      </span>{' '}
                      kết quả:
                    </p>
                    <ul className="space-y-2">
                      <AnimatePresence>
                        {apps.map((app) => (
                          <SearchResultItem
                            key={app.id}
                            app={app}
                            onClick={() => handleAppClick(app.slug)}
                          />
                        ))}
                      </AnimatePresence>
                    </ul>
                  </>
                )}
              </div>
              
              {/* Footer hint */}
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-850">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Nhấn <kbd className="px-1 py-0.5 border rounded bg-gray-200 dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300">ESC</kbd> để đóng.
                </p>
              </div>

            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
