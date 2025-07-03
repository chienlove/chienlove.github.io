import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <Link href={`/${app.slug}`}>
      <a className="flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition duration-200">
        {/* Icon */}
        <div className="w-16 h-16 flex-shrink-0 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-600">
          <img
            src={app.icon_url || '/placeholder-icon.png'}
            alt={app.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/placeholder-icon.png';
            }}
          />
        </div>

        {/* Thông tin */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
            {app.name}
          </h3>
          {app.subtitle && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {app.subtitle}
            </p>
          )}
        </div>

        {/* Badge phiên bản */}
        {app.version && (
          <span className="ml-auto text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full font-medium whitespace-nowrap">
            v{app.version}
          </span>
        )}
      </a>
    </Link>
  );
}