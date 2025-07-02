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
      <div className="bg-white dark:bg-gray-900">
        {/* App header */}
        <div className="container mx-auto px-4 pt-8 pb-4 flex gap-5 items-center">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
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
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{app.name}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">{app.author || 'Không rõ tác giả'}</p>
          </div>
        </div>

        {/* Join button */}
        {app.testflight_url && (
          <div className="container mx-auto px-4 mt-2">
            <a
              href={app.testflight_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition active:scale-95"
            >
              Tham gia TestFlight
            </a>
          </div>
        )}

        {/* Info + Description */}
        <div className="container mx-auto px-4 mt-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 pb-4 mb-4">
            <div>
              <h2 className="font-medium text-gray-500 dark:text-gray-400">Phiên bản</h2>
              <p className="text-gray-900 dark:text-white">{app.version || 'Không rõ'}</p>
            </div>
            {app.size && (
              <div>
                <h2 className="font-medium text-gray-500 dark:text-gray-400">Dung lượng</h2>
                <p className="text-gray-900 dark:text-white">{app.size} MB</p>
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Mô tả</h2>
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

          {/* Ảnh màn hình dạng slide ngang */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="mb-12">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Ảnh màn hình</h2>
              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {app.screenshots.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
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
    </Layout>
  );
}