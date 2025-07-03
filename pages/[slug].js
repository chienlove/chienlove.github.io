// IMPORT
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
  faUser,
  faDatabase
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

        if (!appData || error) {
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
            console.error(e);
          } finally {
            fac.destroy();
          }
        }
      } catch (err) {
        console.error(err);
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
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
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
      <div className="relative bg-gray-100 min-h-screen">
        {/* Breadcrumb */}
        <div className="absolute top-4 left-4 z-20">
          <Link href="/">
            <a className="inline-flex items-center bg-white/80 backdrop-blur px-3 py-1.5 rounded-full shadow text-sm font-bold text-blue-600 hover:text-blue-800">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>

        {/* App Header */}
        <div
          className="w-full pb-6"
          style={{
            backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f5f5f7)`
          }}
        >
          <div className="container mx-auto px-4 pt-10 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-4 border-white shadow">
              <img
                src={app.icon_url || '/placeholder-icon.png'}
                alt={app.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-black">{app.name}</h1>
            <p className="text-gray-700 text-sm">{app.author}</p>

            {/* Action button */}
            <div className="mt-4">
              {app.category === 'testflight' && app.testflight_url && (
                <a
                  href={app.testflight_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 border border-blue-600 px-4 py-1.5 rounded-full font-semibold hover:bg-blue-50 transition text-sm"
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
                  className="inline-flex items-center text-green-600 border border-green-600 px-4 py-1.5 rounded-full font-semibold hover:bg-green-50 transition text-sm"
                >
                  <FontAwesomeIcon icon={faDownload} className="mr-2" />
                  Cài đặt ứng dụng
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="container mx-auto px-2 sm:px-4 mt-6 space-y-6">
          {/* Info Card */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between text-sm text-gray-700 font-medium">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faCodeBranch} />
                <span>Phiên bản</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} />
                <span>Tác giả</span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faDatabase} />
                <span>Dung lượng</span>
              </div>
            </div>
            <div className="flex justify-between mt-2 font-semibold text-gray-900 text-center">
              <span>{app.version || 'Không rõ'}</span>
              <span>{app.author || 'Không rõ'}</span>
              <span>{app.size ? `${app.size} MB` : 'Không rõ'}</span>
            </div>
          </div>

          {/* Description Card */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Mô tả</h2>
            <p className="text-gray-700 whitespace-pre-line">
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

          {/* Screenshot Card */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {app.screenshots.map((url, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border border-gray-200"
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

          {/* Related Apps */}
          {related.length > 0 && (
            <div className="bg-white rounded-xl shadow p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id}>
                    <a className="flex items-center gap-4 py-3 hover:bg-gray-50 rounded-lg transition">
                      <img
                        src={item.icon_url || '/placeholder-icon.png'}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="text-gray-800 font-semibold">{item.name}</p>
                        <p className="text-gray-500 text-sm">{item.author}</p>
                      </div>
                      {item.version && (
                        <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">
                          v{item.version}
                        </span>
                      )}
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