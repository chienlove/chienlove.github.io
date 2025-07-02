import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export default function Detail() {
  const router = useRouter();
  const { slug } = router.query;
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;

    const fetchApp = async () => {
      try {
        setLoading(true);
        let { data: appData, error } = await supabase
          .from('apps')
          .select('*')
          .eq('slug', slug)
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                    {app.name || 'Không tên'}
                    {app.version && (
                      <small className="ml-2 text-lg text-gray-600 dark:text-gray-300">
                        v{app.version}
                      </small>
                    )}
                  </h1>
                  {app.author && (
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                      <span className="font-medium">Tác giả:</span> {app.author}
                    </p>
                  )}
                </div>

                {app.testflight_url && (
                  <a
                    href={app.testflight_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition whitespace-nowrap text-center"
                  >
                    Tham gia TestFlight
                  </a>
                )}
              </div>
            </div>

            <div className="w-full h-64 md:h-80 bg-gray-100 dark:bg-gray-700">
              <img
                src={app.banner_url || '/placeholder-banner.jpg'}
                alt="Banner"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.target.src = '/placeholder-banner.jpg';
                  e.target.className =
                    'w-full h-full object-contain p-8 bg-gray-100 dark:bg-gray-700';
                }}
              />
            </div>

            <div className="p-6 md:p-8">
              {app.description ? (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Mô tả</h2>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">
                    {app.description}
                  </p>
                </div>
              ) : (
                <p className="italic text-gray-400 mb-8">Chưa có mô tả.</p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {app.size && (
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Dung lượng</h3>
                    <p className="text-gray-600 dark:text-gray-400">{app.size} MB</p>
                  </div>
                )}
                {app.device && (
                  <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-1">Thiết bị hỗ trợ</h3>
                    <p className="text-gray-600 dark:text-gray-400">{app.device}</p>
                  </div>
                )}
              </div>

              {Array.isArray(app.screenshots) && app.screenshots.length > 0 ? (
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Ảnh màn hình</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {app.screenshots.map((url, i) => (
                      <div
                        key={i}
                        className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${i + 1}`}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            e.target.src = '/placeholder-screenshot.jpg';
                            e.target.className =
                              'w-full h-48 object-contain p-4 bg-gray-100 dark:bg-gray-700';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="italic text-gray-400">Chưa có ảnh màn hình.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}