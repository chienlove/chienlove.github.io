import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {app.banner_url ? (
        <img 
          src={app.banner_url} 
          alt={app.name}
          className="w-full h-48 object-cover"
          onError={(e) => {
            e.target.src = '/placeholder-banner.jpg';
            e.target.className = 'w-full h-48 object-contain bg-gray-100 dark:bg-gray-700 p-4';
          }}
        />
      ) : (
        <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white truncate">{app.name}</h3>
          {app.version && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-200">
              v{app.version}
            </span>
          )}
        </div>

        {app.author && (
          <p className="text-gray-600 dark:text-gray-400 mb-3">
            <span className="font-medium">Tác giả:</span> {app.author}
          </p>
        )}

        {app.description && (
          <p className="text-gray-700 dark:text-gray-300 mb-4 line-clamp-2">
            {app.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          {app.size && (
            <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
              {app.size} MB
            </span>
          )}
          {app.device && (
            <span className="bg-gray-100 text-gray-800 text-xs px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
              {app.device}
            </span>
          )}
        </div>

        <div className="flex justify-between items-center">
          <Link href={`/${app.slug}`}>
            <a className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
              Xem chi tiết
            </a>
          </Link>

          {app.testflight_url && (
            <a 
              href={app.testflight_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition"
            >
              TestFlight
            </a>
          )}
        </div>
      </div>
    </div>
  );
}         