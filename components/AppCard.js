// components/AppCard.js
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

export default function AppCard({ app, mode = 'card' }) {
  const isList = mode === 'list';

  function isNew(createdAt) {
    if (!createdAt) return false;
    const created = new Date(createdAt);
    const now = new Date();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  return (
    <div
      className={
        isList
          ? 'flex items-start justify-between gap-3 px-2 py-3 rounded-lg'
          : 'flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 transition duration-200'
      }
    >
      {/* Icon app */}
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-1">
        <img
          src={app.icon_url || '/placeholder-icon.png'}
          alt={app.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/placeholder-icon.png';
          }}
        />
        {isNew(app.created_at) && (
          <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden z-10 pointer-events-none">
            <div className="absolute top-[6px] left-[-25px] w-[80px] rotate-[-45deg] bg-red-600 text-white text-[10px] font-bold text-center py-[0.5px] shadow-md">
              NEW
            </div>
          </div>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex-1 min-w-0 border-t border-gray-200 dark:border-gray-700 pt-2">
        <div className="flex items-center justify-between">
          {/* ✅ Link ở tên app */}
          <Link
            href={`/${app.slug}`}
            prefetch={false}
            className="text-[16px] font-semibold text-gray-900 dark:text-white truncate
                       hover:underline active:opacity-70 active:scale-[0.98]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
                       focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800
                       transition-transform duration-100 ease-in-out"
            aria-label={`Xem chi tiết ${app.name}`}
          >
            {app.name}
          </Link>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 truncate">
            {app.author && <span>{app.author}</span>}
            {app.version && (
              <span className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                v{app.version}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ✅ Icon download */}
      <Link
        href={`/${app.slug}`}
        prefetch={false}
        className="group flex items-center justify-center w-10 h-14 mt-1 rounded-md
                   active:scale-95 active:opacity-70
                   focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
                   focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800
                   transition-transform duration-100 ease-in-out"
        aria-label={`Tải ứng dụng ${app.name}`}
        title="Xem chi tiết"
      >
        <FontAwesomeIcon
          icon={faDownload}
          className="text-blue-500 text-xl group-hover:opacity-80 group-active:opacity-60 transition"
        />
      </Link>
    </div>
  );
}