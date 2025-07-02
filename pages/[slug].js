import React from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Detail() {
  const router = useRouter();
  const rawSlug = router.query.slug;
  const slug = (rawSlug || '').toLowerCase(); // ✅ Xử lý lowercase
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchApp = async () => {
      try {
        setLoading(true);

        // Truy vấn slug không phân biệt hoa/thường
        let { data: appData, error } = await supabase
          .from('apps')
          .select('*')
          .ilike('slug', slug)
          .single();

        if (error || !appData) {
          // Nếu slug không đúng, thử tìm theo ID
          const { data: appById } = await supabase
            .from('apps')
            .select('*')
            .eq('id', slug)
            .single();

          if (appById) {
            router.replace(`/${appById.slug}`);
            return;
          }

          router.replace('/404');
          return;
        }

        setApp(appData);
        console.log("Fetched app:", appData);
      } catch (err) {
        console.error('Fetch error:', err);
        router.replace('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <p>Đang tải ứng dụng...</p>
        </div>
      </Layout>
    );
  }

  if (!app) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Không tìm thấy ứng dụng</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Quay về trang chủ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={app.name}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        {/* Header */}
        <div className="flex items-center space-x-4 mb-4">
          <button
            onClick={() => router.back()}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{app.name}</h1>
        </div>

        {/* App Icon and Title */}
        <div className="flex items-center justify-center mb-4">
          <img
            src={app.icon_url || '/placeholder-icon.png'} // Thay thế bằng URL icon thực tế
            alt="App Icon"
            className="w-32 h-32 object-cover rounded-full shadow-md"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mb-6">
          <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-medium transition">
            MỞ
          </button>
          <button className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition">
            GỬI PHẢN HỒI
          </button>
        </div>

        {/* Developer Information */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <img
                src="https://via.placeholder.com/40x40?text=User" // Thay thế bằng avatar nhà phát triển
                alt="Developer Avatar"
                className="w-10 h-10 rounded-full"
              />
            </div>
            <div>
              <p className="text-gray-800 dark:text-white font-medium">{app.author || 'Không rõ'}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{app.category || 'Chưa có danh mục'}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-gray-800 dark:text-white font-medium">Hết hạn</span>
            </div>
            <div>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{app.expiration_days || '0'}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Ngày</p>
            </div>
          </div>
        </div>

        {/* Content Inspection */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Nội dung kiểm tra</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
            {app.content_inspection || 'Chưa có thông tin nội dung kiểm tra'}
          </p>
        </div>

        {/* Screenshots */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Ảnh màn hình</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.isArray(app.screenshots) && app.screenshots.length > 0 ? (
              app.screenshots.map((screenshot, index) => (
                <div key={index} className="relative overflow-hidden rounded-lg shadow-md">
                  <img
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    className="w-full h-48 object-cover"
                  />
                </div>
              ))
            ) : (
              <p className="italic text-gray-400">Chưa có ảnh màn hình.</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}