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
  const rawSlug = router.query.slug;
  const slug = (rawSlug || '').toLowerCase();
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

        const { data: relatedApps } = await supabase
          .from('apps')
          .select('id, name, slug, icon_url, author, version')
          .eq('category', appData.category)
          .neq('id', appData.id)
          .limit(10);

        setRelated(relatedApps || []);

        if (typeof window !== 'undefined' && appData.icon_url) {
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
        {/* Breadcrumb */}
        <div className="absolute top-3 left-3 z-20">
          <Link href="/">
            <a className="inline-flex items-center bg-white/70 backdrop-blur-sm text-blue-600 hover:text-blue-800 text-sm font-bold px-3 py-1.5 rounded-full shadow">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>

        {/* Header */}
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
          <div className="px-4 pt-10 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-lg">
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
            <h1 className="mt-4 text-2xl font-bold text-white drop-shadow">{app.name}</h1>
            {app.author && (
              <p className="text-white text-sm opacity-90">{app.author}</p>
            )}
            {/* Action button */}
            {app.category === 'testflight' && app.testflight_url && (
              <a
                href={app.testflight_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-1 border border-white text-white font-bold text-sm rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <FontAwesomeIcon icon={faRocket} className="mr-2" />
                Tham gia
              </a>
            )}
            {app.category === 'jailbreak' && app.download_link && (
              <a
                href={app.download_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 px-4 py-1 border border-white text-white font-bold text-sm rounded-full bg-white/10 hover:bg-white/20 transition"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Cài đặt
              </a>
            )}
          </div>
        </div>

        {/* Main content container */}
        <div className="max-w-5xl mx-auto px-4 space-y-6 -mt-8">
          {/* Info */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow border">
            <div className="grid grid-cols-3 gap-4 text-sm text-gray-800 dark:text-white text-center font-medium">
              <div>
                <FontAwesomeIcon icon={faCodeBranch} className="text-blue-500 mr-2" />
                <span className="block mt-1">{app.version || 'Không rõ'}</span>
              </div>
              <div>
                <FontAwesomeIcon icon={faUser} className="text-purple-500 mr-2" />
                <span className="block mt-1">{app.author || 'Không rõ'}</span>
              </div>
              <div>
                <FontAwesomeIcon icon={faDatabase} className="text-green-500 mr-2" />
                <span className="block mt-1">{app.size ? `${app.size} MB` : 'Không rõ'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow border">
            <h2 className="text-lg font-bold mb-2">Mô tả</h2>
            <p className="whitespace-pre-line">
              {showFullDescription
                ? app.description
                : truncate(app.description, 500)}
            </p>
            {app.description && app.description.length > 500 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-blue-600 hover:underline font-bold text-sm"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {/* Screenshots */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow border">
              <h2 className="text-lg font-bold mb-3">Ảnh màn hình</h2>
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

          {/* Related apps */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-900 p-4 rounded-xl shadow border">
              <h2 className="text-lg font-bold mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id}>
                    <a className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 rounded">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.icon_url || '/placeholder-icon.png'}
                          alt={item.name}
                          className="w-12 h-12 rounded-md object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white">{item.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.author || 'Không rõ'} – v{item.version || 'n/a'}</p>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faDownload} className="text-blue-500" />
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