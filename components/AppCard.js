import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';
import { memo, useMemo } from 'react';

const AppCard = memo(function AppCard({ app, mode = 'card' }) {
  const isList = mode === 'list';

  // ✅ Memoize isNew calculation để tránh tính toán lại mỗi render
  const isNewApp = useMemo(() => {
    if (!app?.created_at) return false;
    const created = new Date(app.created_at);
    const now = new Date();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours <= 24;
  }, [app?.created_at]);

  // ✅ Memoize style classes
  const linkClassName = useMemo(() => {
    return isList
      ? 'flex items-start justify-between gap-3 px-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 rounded-lg'
      : 'flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md hover:scale-[1.02] transition-all duration-200';
  }, [isList]);

  // ✅ Memoize fallback image handler
  const handleImageError = useMemo(() => {
    return (e) => {
      if (e.target.src !== '/placeholder-icon.png') {
        e.target.onerror = null;
        e.target.src = '/placeholder-icon.png';
      }
    };
  }, []);

  // ✅ Early return if no app data
  if (!app) {
    return (
      <div className={linkClassName.replace('hover:', '').replace('transition-all duration-200', '')} 
           style={{ opacity: 0.5 }}>
        <div className="animate-pulse">
          <div className="w-14 h-14 bg-gray-300 rounded-2xl"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/${app.slug}`}
      prefetch={false} // ✅ Ngăn prefetch file JSON
      className={linkClassName}
      aria-label={`Xem chi tiết ${app.name}`} // ✅ Accessibility
    >
      {/* ✅ Icon container với better responsive */}
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-1">
        <img
          src={app.icon_url || '/placeholder-icon.png'}
          alt={`Icon ${app.name}`}
          className="w-full h-full object-cover transition-transform duration-200 hover:scale-110"
          onError={handleImageError}
          loading="lazy" // ✅ Lazy loading
          decoding="async" // ✅ Non-blocking decode
        />
        
        {/* ✅ NEW badge với position cải tiến */}
        {isNewApp && (
          <div 
            className="absolute -top-0.5 -left-0.5 w-16 h-16 overflow-hidden z-10 pointer-events-none"
            aria-label="Ứng dụng mới"
          >
            <div className="absolute top-1.5 left-[-22px] w-[70px] rotate-[-45deg] bg-gradient-to-r from-red-500 to-red-600 text-white text-[9px] font-bold text-center py-0.5 shadow-md">
              NEW
            </div>
          </div>
        )}
      </div>

      {/* ✅ Content section với better spacing */}
      <div className="flex-1 min-w-0 border-t border-gray-200 dark:border-gray-700 pt-2">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate pr-2 leading-tight">
            {app.name}
          </h3>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 min-w-0">
            {/* ✅ Author với fallback */}
            {app.author && (
              <span className="truncate max-w-[120px]" title={app.author}>
                {app.author}
              </span>
            )}
            
            {/* ✅ Version badge với conditional rendering */}
            {app.version && (
              <span 
                className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
                title={`Phiên bản ${app.version}`}
              >
                v{app.version}
              </span>
            )}
          </div>
        </div>

        {/* ✅ Additional metadata (optional) */}
        {(app.downloads > 0 || app.views > 0) && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {app.category === 'testflight' 
              ? `${app.views || 0} lượt xem`
              : `${app.downloads || 0} lượt tải`
            }
          </div>
        )}
      </div>

      {/* ✅ Download icon với animation */}
      <div className="flex items-center justify-center w-10 h-14 mt-1">
        <div className="p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors duration-200">
          <FontAwesomeIcon 
            icon={faDownload} 
            className="text-blue-500 text-lg hover:text-blue-600 transition-colors duration-200" 
            aria-label="Tải xuống"
          />
        </div>
      </div>
    </Link>
  );
});

export default AppCard;