// pages/[slug].js
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';

export default function Detail() {
  const router = useRouter();
  const rawSlug = router.query.slug;
  const slug = (rawSlug || '').toLowerCase();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('#f5f5f7');
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchApp = async () => {
      try {
        setLoading(true);
        let { data: appData, error } = await supabase
          .from('apps')
          .select('*')
          .ilike('slug', slug)
          .single();

        if (error || !appData) {
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

        if (typeof window !== 'undefined' && appData.icon_url) {
          const fac = new FastAverageColor();
          try {
            const color = await fac.getColorAsync(appData.icon_url);
            setDominantColor(color.hex);
          } catch (e) {
            console.error('Error extracting color:', e);
          } finally {
            fac.destroy();
          }
        }
      } catch (err) {
        console.error('Fetch error:', err);
        router.replace('/404');
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [slug]);

  const truncate = (text, limit) => {
    if (!text) return '';
    return text.length > limit ? text.substring(0, limit).trim() + '...' : text;
  };

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
      <div className="relative">
        {/* Nền với màu icon */}
        <div className="h-64 w-full relative" style={{ backgroundColor: dominantColor }}>
          <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-900 to-transparent opacity-90" />
          <div className="container mx-auto px-4 relative z-10 h-full flex justify-center items-end pb-6">
            <div className="text-center">
              <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-2xl shadow-lg overflow-hidden border-4 border-white dark:border-gray-800">
                <img
                  src={app.icon_url || '/placeholder-icon.png'}
                  alt={`${app.name} icon`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/placeholder-icon.png';
                  }}
                />
              </div>
              <h1 className="mt-3 text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                {app.name || 'Không tên'}
              </h1>
              {app.author && (
                <p className="text-sm text-gray-700 dark:text-gray-300">{app.author}</p>
              )}
            </div>
          </div>
        </div>

        {/* Nội dung chi tiết */}
        <div className="container mx-auto px-4 -mt-12 relative z-20 mb-16">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
            {app.testflight_url && (
              <div className="p-6">
                <a
                  href={app.testflight_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-6 rounded-xl font-medium transition active:scale-95"
                >
                  Tham gia TestFlight
                </a>
              </div>
            )}

            {/* Thông tin */}
            <div className="px-6 py-5">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Phiên bản</h2>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {app.version || 'Không rõ'}
                  </p>
                </div>
                {app.size && (
                  <div>
                    <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Dung lượng</h2>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {app.size} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mô tả */}
            <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-700/50">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Mô tả</h2>
              <p className="text-gray-900 dark:text-white whitespace-pre-line">
                {showFullDescription
                  ? app.description
                  : truncate(app.description, 800)}
              </p>
              {app.description && app.description.length > 800 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="mt-2 text-sm text-blue-600 hover:underline"
                >
                  {showFullDescription ? 'Thu gọn' : 'Xem thêm'}
                </button>
              )}
            </div>

            {/* Ảnh màn hình slide ngang */}
            {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
              <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-700/50">
                <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Ảnh màn hình</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                  {app.screenshots.map((url, i) => (
                    <div
                      key={i}
                      className="flex-shrink-0 w-52 md:w-60 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-auto object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/placeholder-screenshot.jpg';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}