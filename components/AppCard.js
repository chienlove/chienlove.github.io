import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

export default function AppCard({ app, mode = 'card' }) {
  const isList = mode === 'list';

  return (
    <Link
      href={`/${app.slug}`}
      className={
        isList
          ? 'flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded-lg transition'
          : 'flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition duration-200'
      }
    >
      <div className="flex items-center gap-3">
        <img
          src={app.icon_url || '/placeholder-icon.png'}
          alt={app.name}
          className={
            isList
              ? 'w-12 h-12 rounded-lg object-cover'
              : 'w-16 h-16 rounded-xl object-cover shadow-sm'
          }
        />
        <div className="flex flex-col">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{app.name}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
            {app.author && <span>{app.author}</span>}
            {app.version && (
              <span className="bg-gray-200 dark:bg-gray-700 dark:text-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                {app.version}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Icon tải xuống nằm giữa, to hơn */}
      <div className="flex items-center justify-center w-10 h-10">
        <FontAwesomeIcon icon={faDownload} className="text-blue-500 text-xl" />
      </div>
    </Link>
  );
}