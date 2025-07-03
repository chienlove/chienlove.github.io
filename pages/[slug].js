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
          .limit(6);

        setRelated(relatedApps || []);

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
      {/* Màu nền full lề */}
      <div
        className="min-h-screen pb-10"
        style={{
          backgroundImage: `linear-gradient(to bottom, ${dominantColor}, ${
            typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
              ? '#111827'
              : '#f9fafb'
          })`
        }}
      >
        {/* Breadcrumb */}
        <div className="absolute top-3 left-3 z-30">
          <Link href="/">
            <a className="inline-flex items-center bg-white/80 backdrop-blur px-3 py-1 rounded-full text-blue-600 font-bold text-sm shadow">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>

        {/* Icon + Tên App + Nút */}
        <div className="text-center pt-16">
          <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-lg">
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
          <h1 className="mt-4 text-2xl font-bold text-white">{app.name}</h1>
          {app.author && <p className="text-white text-sm">{app.author}</p>}

          <div className="mt-3">
            {app.category === 'testflight' && app.testflight_url && (
              <a
                href={app.testflight_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-1.5 text-sm border border-white text-white rounded-full font-medium bg-white/10 hover:bg-white/20"
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
                className="inline-flex items-center px-4 py-1.5 text-sm border border-white text-white rounded-full font-medium bg-white/10 hover:bg-white/20"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Cài đặt ứng dụng
              </a>
            )}
          </div>
        </div>

        {/* Nội dung trong card trắng, sát lề */}
        <div className="mt-6 px-3 md:px-8">
          <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-5">
            {/* Thông tin */}
            <div className="flex justify-between text-sm text-gray-800 dark:text-gray-200 font-medium border-b pb-4">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCodeBranch} className="text-blue-600" />
                Phiên bản: <span className="font-normal">{app.version || 'Không rõ'}</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-purple-600" />
                Tác giả: <span className="font-normal">{app.author || 'Không rõ'}</span>
              </div>
              {app.size && (
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faDatabase} className="text-green-600" />
                  Dung lượng: <span className="font-normal">{app.size} MB</span>
                </div>
              )}
            </div>

            {/* Mô tả */}
            <div className="py-5">
              <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-white">Mô tả</h2>
              <p className="text-gray-700 dark:text-white whitespace-pre-line">
                {showFullDescription ? app.description : truncate(app.description, 500)}
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

            {/* Ảnh màn hình */}
            {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
              <div className="py-4">
                <h2 className="text-lg font-bold mb-3 text-gray-800 dark:text-white">Ảnh màn hình</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide">
                  {app.screenshots.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-48 md:w-56 rounded-xl border"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/placeholder-screenshot.jpg';
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ứng dụng cùng chuyên mục */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl mt-6 p-5">
              <h2 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id}>
                    <a className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.icon_url || '/placeholder-icon.png'}
                          alt={item.name}
                          className="w-10 h-10 rounded-lg object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-icon.png';
                          }}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.author || 'Không rõ'} • v{item.version}</p>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faDownload} className="text-gray-400 w-4" />
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