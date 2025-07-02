import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import FastAverageColor from 'fast-average-color';

export default function Detail() {
  const router = useRouter();
  const rawSlug = router.query.slug;
  const slug = (rawSlug || '').toLowerCase();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState('#f5f5f7');
  const bannerRef = useRef(null);
  const fac = new FastAverageColor();

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
        
        // Lấy màu chủ đạo từ icon
        if (appData.icon_url) {
          try {
            const color = await fac.getColorAsync(appData.icon_url);
            setDominantColor(color.hex);
          } catch (e) {
            console.error('Error extracting color:', e);
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

    return () => {
      fac.destroy();
    };
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header với màu nền lấy từ icon */}
        <div 
          className="h-64 w-full relative"
          style={{ backgroundColor: dominantColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-gray-50 dark:from-gray-900 to-transparent" />
          <div className="container mx-auto px-4 relative z-10 h-full flex items-end pb-8">
            <div className="flex items-end gap-6">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl shadow-xl overflow-hidden border-4 border-white dark:border-gray-800">
                <img
                  src={app.icon_url || '/placeholder-icon.png'}
                  alt={`${app.name} icon`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '/placeholder-icon.png';
                  }}
                />
              </div>
              <div className="mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                  {app.name || 'Không tên'}
                </h1>
                {app.author && (
                  <p className="text-gray-700 dark:text-gray-300">
                    {app.author}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="container mx-auto px-4 -mt-12 relative z-20">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            {/* Button TestFlight */}
            {app.testflight_url && (
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <a
                  href={app.testflight_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-6 rounded-lg font-medium transition"
                >
                  Tham gia TestFlight
                </a>
              </div>
            )}

            {/* Thông tin phiên bản */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Phiên bản</h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {app.version || 'Không rõ'}
                  </p>
                </div>
                {app.size && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Dung lượng</h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      {app.size} MB
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Mô tả */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Mô tả</h2>
              {app.description ? (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                  {app.description}
                </p>
              ) : (
                <p className="italic text-gray-400">Chưa có mô tả.</p>
              )}
            </div>

            {/* Ảnh màn hình */}
            {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ảnh màn hình</h2>
                <div className="grid grid-cols-1 gap-4">
                  {app.screenshots.map((url, i) => (
                    <div
                      key={i}
                      className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={url}
                        alt={`Screenshot ${i + 1}`}
                        className="w-full h-auto"
                        onError={(e) => {
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