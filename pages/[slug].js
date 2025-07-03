import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faRocket,
  faArrowLeft,
  faCodeBranch,
  faDatabase,
  faUser
} from '@fortawesome/free-solid-svg-icons';

export default function Detail() {
  const router = useRouter();
  const slug = (router.query.slug || '').toLowerCase();
  const [app, setApp] = useState(null);
  const [related, setRelated] = useState([]);
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
          const { data: fallback } = await supabase
            .from('apps')
            .select('*')
            .eq('id', slug)
            .single();

          if (fallback) {
            router.replace(`/${fallback.slug}`);
            return;
          }
          router.replace('/404');
          return;
        }

        setApp(appData);

        const { data: relatedApps } = await supabase
          .from('apps')
          .select('id, name, slug, icon_url, author, version')
          .eq('category', appData.category)
          .neq('id', appData.id)
          .limit(6);

        setRelated(relatedApps || []);

        if (appData.icon_url) {
          const fac = new FastAverageColor();
          try {
            const color = await fac.getColorAsync(appData.icon_url);
            setDominantColor(color.hex);
          } catch (e) {
            console.error('Color error:', e);
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
        <div className="min-h-screen flex items-center justify-center text-center">
          <h1 className="text-2xl font-bold mb-4">Không tìm thấy ứng dụng</h1>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-bold"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Quay về trang chủ
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={app.name}>
      <div className="relative">
        {/* Breadcrumb */}
        <div className="absolute top-3 left-3 z-20">
          <Link href="/">
            <a className="inline-flex items-center bg-white/80 backdrop-blur text-blue-600 hover:text-blue-800 text-sm font-bold px-3 py-1.5 rounded-full shadow">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>

        {/* App icon + background */}
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
                alt={app.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white drop-shadow">{app.name}</h1>
            {app.author && (
              <p className="text-white text-sm opacity-90">{app.author}</p>
            )}
          </div>
        </div>

        <div className="container mx-auto px-4 -mt-12 relative z-10">
          {/* Button install / join */}
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

          {/* Thông tin ứng dụng */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-700 dark:text-gray-300 mt-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {app.version && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCodeBranch} className="text-blue-500 w-4" />
                <span className="font-medium">Phiên bản:</span>
                <span>{app.version}</span>
              </div>
            )}
            {app.size && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faDatabase} className="text-green-500 w-4" />
                <span className="font-medium">Dung lượng:</span>
                <span>{app.size} MB</span>
              </div>
            )}
            {app.author && (
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-purple-500 w-4" />
                <span className="font-medium">Tác giả:</span>
                <span>{app.author}</span>
              </div>
            )}
          </div>

          {/* Mô tả */}
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
                className="mt-2 text-sm text-blue-600 hover:underline font-bold"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {/* Ảnh màn hình */}
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
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ứng dụng cùng chuyên mục */}
          {related.length > 0 && (
            <div className="py-8">
              <h2 className="text-lg font-bold text-black dark:text-white mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id}>
                    <a className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow transition">
                      <div className="flex flex-col items-center">
                        <img
                          src={item.icon_url || '/placeholder-icon.png'}
                          alt={item.name}
                          className="w-16 h-16 rounded-lg object-cover mb-2"
                        />
                        <p className="text-center text-sm font-bold text-gray-900 dark:text-white truncate w-full">{item.name}</p>
                        {item.author && (
                          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-1 truncate w-full">{item.author}</p>
                        )}
                        {item.version && (
                          <span className="mt-2 inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                            v{item.version}
                          </span>
                        )}
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}