import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faRocket, faArrowLeft } from '@fortawesome/free-solid-svg-icons';

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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
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
        <div className="container mx-auto px-4 pt-4">
          <Link href="/">
            <a className="inline-flex items-center text-blue-600 hover:text-blue-800 text-base font-semibold">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>
      </div>

      <div className="relative">
        <div
          className="w-full pb-8"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${dominantColor}, ${
              typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
                ? '#111827'
                : '#ffffff'
            })`
          }}
        >
          <div className="container mx-auto px-4 pt-10 text-center">
            <div className="w-24 h-24 md:w-28 md:h-28 mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-lg">
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
            <h1 className="mt-4 text-2xl font-bold text-white drop-shadow">{app.name}</h1>
            {app.author && (
              <p className="text-white text-sm opacity-90">{app.author}</p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-12 relative z-10">
          {app.category === 'testflight' && app.testflight_url && (
            <a
              href={app.testflight_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-bold transition active:scale-95"
            >
              <FontAwesomeIcon icon={faRocket} className="mr-2" />
              Tham gia TestFlight
            </a>
          )}

          {app.category === 'jailbreak' && app.download_link && (
            <a
              href={app.download_link}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-bold transition active:scale-95"
            >
              <FontAwesomeIcon icon={faDownload} className="mr-2" />
              Cài đặt ứng dụng
            </a>
          )}

          <div className="grid grid-cols-2 gap-6 text-sm text-gray-700 dark:text-gray-300 mt-5 border-b border-gray-200 dark:border-gray-700 pb-4">
            <div>
              <h2 className="font-medium">Phiên bản</h2>
              <p>{app.version || 'Không rõ'}</p>
            </div>
            {app.size && (
              <div>
                <h2 className="font-medium">Dung lượng</h2>
                <p>{app.size} MB</p>
              </div>
            )}
          </div>

          <div className="py-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-black dark:text-white mb-2">Mô tả</h2>
            <p className="text-gray-800 dark:text-white whitespace-pre-line">
              {showFullDescription
                ? app.description
                : truncate(app.description, 500)}
            </p>
            {app.description && app.description.length > 500 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="py-6">
              <h2 className="text-lg font-bold text-black dark:text-white mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {app.screenshots.map((url, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700"
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
    </Layout>
  );
}