// SearchModal.js
'use client';

import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTimes,
  faChevronDown,
  faFire,
  faSort,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';

import AppCard from './AppCard';

/**
 * HotAppItem: icon nhỏ hơn, khoảng cách thoáng hơn
 */
const HotAppItem = ({ app, onClick }) => {
  const iconSrc = app.icon_url || null;

  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onClick(app.name)}
      title={app.name}
      className="cursor-pointer group flex flex-col items-center w-[4.25rem] focus:outline-none"
    >
      <div
        className="w-14 h-14 rounded-2xl overflow-hidden
                   bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700
                   flex items-center justify-center shadow-md
                   group-hover:shadow-xl group-hover:ring-2 group-hover:ring-blue-400/40
                   transition-all duration-200 border border-gray-200 dark:border-gray-700"
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={app.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-gray-600 dark:text-gray-300 text-lg font-semibold">
            {app.name.charAt(0)}
          </span>
        )}
      </div>
      <span className="mt-2 text-[11px] font-semibold text-gray-700 dark:text-gray-200 text-center truncate w-full px-0.5">
        {app.name}
      </span>
    </motion.button>
  );
};

const SearchResultItem = ({ app, onClick }) => (
  <motion.li
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    onClick={onClick}
    className="cursor-pointer"
  >
    <AppCard app={app} mode="list" />
  </motion.li>
);

const SearchSkeleton = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 dark:bg-gray-800 animate-pulse"
      >
        <div className="w-12 h-12 rounded-xl bg-gray-200 dark:bg-gray-700" />
        <div className="flex-1 space-y-2.5">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-lg w-1/2" />
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
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-12 md:pt-20 px-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.96, y: -20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: -20, opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
            className="relative w-full max-w-xl md:max-w-2xl"
          >
            <div
              className="bg-white dark:bg-gray-900 
                         rounded-2xl shadow-2xl border border-gray-200/60 dark:border-gray-700/60
                         overflow-hidden transition-colors"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-400/10 flex items-center justify-center">
                      <FontAwesomeIcon
                        icon={faSearch}
                        className="w-5 h-5 text-blue-600 dark:text-blue-400"
                      />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                      Tìm kiếm ứng dụng
                    </h2>
                  </div>
                  <button
                    onClick={() => setSearchOpen(false)}
                    className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all group"
                  >
                    <FontAwesomeIcon
                      icon={faTimes}
                      className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200"
                    />
                  </button>
                </div>
              </div>

              {/* Input */}
              <div className="px-6 py-5">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Nhập tên ứng dụng hoặc từ khóa..."
                    className="w-full pl-12 pr-6 py-3.5 text-base rounded-xl
                               bg-gray-50 dark:bg-gray-800 
                               border-2 border-gray-200 dark:border-gray-700
                               focus:border-blue-500 dark:focus:border-blue-400 
                               focus:ring-4 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                               placeholder-gray-400 dark:placeholder-gray-500 
                               text-gray-900 dark:text-gray-100
                               font-medium outline-none transition-all"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="px-6 py-4 border-y border-gray-100 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/60">
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faFilter}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none z-10"
                    />
                    <select
                      value={activeCategory}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 rounded-xl pl-10 pr-9 py-2.5 text-sm
                                 border-2 border-gray-200 dark:border-gray-600 
                                 focus:border-blue-500 dark:focus:border-blue-400
                                 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                 cursor-pointer font-semibold text-gray-800 dark:text-gray-200
                                 appearance-none transition-all hover:bg-gray-50 dark:hover:bg-gray-600 outline-none"
                    >
                      <option value="all">Tất cả chuyên mục</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    />
                  </div>

                  <div className="relative">
                    <FontAwesomeIcon
                      icon={faSort}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 dark:text-gray-400 pointer-events-none z-10"
                    />
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white dark:bg-gray-700 rounded-xl pl-10 pr-9 py-2.5 text-sm
                                 border-2 border-gray-200 dark:border-gray-600 
                                 focus:border-blue-500 dark:focus:border-blue-400
                                 focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-400/10
                                 cursor-pointer font-semibold text-gray-800 dark:text-gray-200
                                 appearance-none transition-all hover:bg-gray-50 dark:hover:bg-gray-600 outline-none"
                    >
                      <option value="created_at">Mới nhất</option>
                      <option value="name">Tên A–Z</option>
                    </select>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
                    />
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="px-6 py-5 max-h-[26rem] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
                {q.trim() === '' ? (
                  <>
                    {hotApps && hotApps.length > 0 && (
                      <div>
                        <div className="flex items-center justify-center gap-2.5 mb-4">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg">
                            <FontAwesomeIcon icon={faFire} className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                            Ứng dụng nổi bật
                          </h3>
                        </div>

                        <div className="grid grid-cols-4 sm:grid-cols-5 gap-x-4 gap-y-5 justify-items-center">
                          {hotApps.slice(0, 12).map((app) => (
                            <HotAppItem
                              key={app.id}
                              app={app}
                              onClick={handleHotAppClick}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : loading ? (
                  <SearchSkeleton />
                ) : apps.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-5xl mb-3">🔍</div>
                    <p className="text-gray-600 dark:text-gray-400 text-base">
                      Không tìm thấy kết quả cho{' '}
                      <span className="font-bold text-gray-900 dark:text-gray-100">"{q}"</span>
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      Vui lòng thử từ khóa khác hoặc kiểm tra lại chính tả.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 px-1">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Tìm thấy{' '}
                        <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
                          {apps.length}
                        </span>{' '}
                        kết quả
                      </p>
                    </div>
                    <ul className="space-y-3">
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

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>Nhấn</span>
                  <kbd className="px-2 py-1 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 font-mono text-gray-700 dark:text-gray-300 text-[11px] font-semibold shadow-sm">
                    ESC
                  </kbd>
                  <span>để đóng</span>
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}