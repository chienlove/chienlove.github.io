// components/SearchModal.js
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faSearch, faFilter, faSortAmountDown } from '@fortawesome/free-solid-svg-icons';

export default function SearchModal({ q, setQ, activeCategory, setCategory, sortBy, setSortBy, apps, loading, searchOpen, setSearchOpen, categories }) {
  const router = useRouter();

  const handleAppClick = (slug) => {
    setSearchOpen(false);
    setQ('');
    setCategory('all');
    router.push(`/${slug}`);
  };

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4">
      <div className="w-full max-w-3xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Tìm kiếm & lọc</h2>
          <button onClick={() => setSearchOpen(false)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <div className="relative mb-3">
          <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            autoFocus
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nhập tên ứng dụng..."
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-red-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faFilter} />
            <span>Danh mục:</span>
            <select value={activeCategory} onChange={(e) => setCategory(e.target.value)} className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
              <option value="all">Tất cả</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-1">
            <FontAwesomeIcon icon={faSortAmountDown} />
            <span>Sắp xếp:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
              <option value="created_at">Mới nhất</option>
              <option value="name">Tên A-Z</option>
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <p className="text-center py-4 text-gray-500">Đang tìm...</p>}
          {!loading && !apps.length && <p className="text-center py-4 text-gray-500">Không có kết quả.</p>}
          <ul className="space-y-2">
            {apps.map(app => (
              <li key={app.id} onClick={() => handleAppClick(app.slug)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer">
                <img src={app.icon_url || '/placeholder-icon.png'} alt={app.name} className="w-10 h-10 rounded-lg object-cover" />
                <div className="flex-1">
                  <p className="font-semibold">{app.name}</p>
                  <p className="text-xs text-gray-500">{app.author}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}