// 📁 pages/Detail.js

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
  const [dominantColor, setDominantColor] = useState('#f0f2f5');
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
          .limit(10);

        setRelated(relatedApps || []);

        if (appData.icon_url && typeof window !== 'undefined') {
          const fac = new FastAverageColor();
          try {
            const color = await fac.getColorAsync(appData.icon_url);
            setDominantColor(color.hex);
          } catch {}
          fac.destroy();
        }
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [slug]);

  const truncate = (text, limit) => text?.length > limit ? text.slice(0, limit) + '...' : text;

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">Đang tải...</div>
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
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Về trang chủ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={app.name}>
      <div className="bg-gray-100 min-h-screen pb-12">
        {/* Breadcrumb */}
        <div className="absolute top-4 left-4 z-20">
          <Link href="/">
            <a className="inline-flex items-center bg-white/80 px-3 py-1.5 rounded-full shadow text-blue-600 font-semibold text-sm hover:text-blue-800">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Trở lại
            </a>
          </Link>
        </div>

        {/* Header */}
        <div
          className="w-full pb-6"
          style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}
        >
          <div className="container mx-auto px-4 pt-12 text-center">
            <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border-4 border-white shadow-lg">
              <img
                src={app.icon_url || '/placeholder-icon.png'}
                alt={app.name}
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-white drop-shadow">{app.name}</h1>
            {app.author && <p className="text-white opacity-90 text-sm">{app.author}</p>}
          </div>
        </div>

        {/* Main content */}
        <div className="container mx-auto px-4 -mt-8 space-y-6">
          {/* Card: Action Button */}
          <div className="bg-white rounded-xl p-4 shadow">
            {app.category === 'testflight' && app.testflight_url && (
              <a
                href={app.testflight_url}
                className="block bg-blue-600 hover:bg-blue-700 text-white text-center py-3 rounded-xl font-bold"
                target="_blank" rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faRocket} className="mr-2" />
                Tham gia TestFlight
              </a>
            )}
            {app.category === 'jailbreak' && app.download_link && (
              <a
                href={app.download_link}
                className="block bg-green-600 hover:bg-green-700 text-white text-center py-3 rounded-xl font-bold"
                target="_blank" rel="noopener noreferrer"
              >
                <FontAwesomeIcon icon={faDownload} className="mr-2" />
                Cài đặt ứng dụng
              </a>
            )}
          </div>

          {/* Card: Thông tin */}
          <div className="bg-white rounded-xl p-4 shadow">
            <div className="text-center text-sm text-gray-600 font-semibold border-b pb-2 mb-2">
              <div className="flex justify-around">
                <span>Phiên bản</span>
                <span>Tác giả</span>
                <span>Dung lượng</span>
              </div>
            </div>
            <div className="flex justify-around text-center text-gray-800 font-medium">
              <span>{app.version || 'Không rõ'}</span>
              <span>{app.author || 'Không rõ'}</span>
              <span>{app.size ? `${app.size} MB` : 'Không rõ'}</span>
            </div>
          </div>

          {/* Card: Mô tả */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Mô tả</h2>
            <p className="text-gray-700 whitespace-pre-line">
              {showFullDescription ? app.description : truncate(app.description, 500)}
            </p>
            {app.description?.length > 500 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="mt-2 text-sm text-blue-600 hover:underline font-bold"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {/* Card: Screenshots */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {app.screenshots.map((url, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border"
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

          {/* Card: Ứng dụng cùng chuyên mục */}
          {related.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id}>
                    <a className="flex items-center py-3 hover:bg-gray-50 px-2 rounded-lg transition">
                      <img
                        src={item.icon_url || '/placeholder-icon.png'}
                        alt={item.name}
                        className="w-12 h-12 rounded-lg object-cover mr-4"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.author} • <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">{item.version || 'N/A'}</span>
                        </p>
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