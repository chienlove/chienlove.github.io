import Head from 'next/head';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faRocket,
  faArrowLeft,
  faCodeBranch,
  faDatabase,
  faUser,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

export async function getServerSideProps(context) {
  const slug = context.params.slug?.toLowerCase();

  const { data: appData, error } = await supabase
    .from('apps')
    .select('*, downloads, views')
    .ilike('slug', slug)
    .single();

  if (!appData || error) {
    return { notFound: true };
  }

  const { data: relatedApps } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version')
    .eq('category', appData.category)
    .neq('id', appData.id)
    .limit(10);

  return {
    props: {
      app: appData,
      related: relatedApps ?? [],
    },
  };
}

export default function AppDetail({ app, related }) {
  return (
    <>
      <Head>
        <title>{app.name} - Tải ứng dụng iOS</title>
        <meta name="description" content={app.description?.slice(0, 160)} />
      </Head>

      <Layout fullWidth>
        <div className="bg-gray-100 min-h-screen pb-12">
          <div className="w-full flex justify-center mt-10 bg-gray-100">
            <div className="relative w-full max-w-screen-2xl px-2 sm:px-4 md:px-6 pb-8 bg-white rounded-none">
              <div
                className="w-full pb-6"
                style={{
                  backgroundImage: `linear-gradient(to bottom, #f0f2f5, #f0f2f5)`,
                }}
              >
                <div className="absolute top-3 left-3 z-10">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                  </Link>
                </div>

                <div className="pt-10 text-center px-4">
                  <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl">
                    <img
                      src={app.icon_url || '/placeholder-icon.png'}
                      alt={app.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h1 className="mt-4 text-2xl font-bold text-gray-900 drop-shadow">
                    {app.name}
                  </h1>
                  {app.author && <p className="text-gray-700 text-sm">{app.author}</p>}
                  <div className="mt-4 space-x-2">
                    {app.category === 'testflight' && app.testflight_url && (
                      <a
                        href={app.testflight_url}
                        className="inline-block border border-blue-500 text-blue-700 hover:bg-blue-100 transition px-4 py-2 rounded-full text-sm font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon icon={faRocket} className="mr-2" />
                        Tham gia TestFlight
                      </a>
                    )}

                    {app.category === 'jailbreak' && app.download_link && (
                      <a
                        href={app.download_link}
                        className="inline-block border border-green-500 text-green-700 hover:bg-green-100 transition px-4 py-2 rounded-full text-sm font-semibold"
                      >
                        <FontAwesomeIcon icon={faDownload} className="mr-2" />
                        Cài đặt ứng dụng
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6 space-y-6">
            <div className="bg-white rounded-xl p-4 shadow flex justify-between text-center overflow-x-auto divide-x divide-gray-200">
              <div className="px-0.5 sm:px-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tác giả</p>
                <FontAwesomeIcon icon={faUser} className="text-xl text-gray-600 mb-1" />
                <p className="text-sm text-gray-800">{app.author || 'Không rõ'}</p>
              </div>

              <div className="px-1 sm:px-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phiên bản</p>
                <FontAwesomeIcon icon={faCodeBranch} className="text-xl text-gray-600 mb-1" />
                <p className="text-sm text-gray-800">{app.version || 'Không rõ'}</p>
              </div>

              <div className="px-1 sm:px-2">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dung lượng</p>
                <FontAwesomeIcon icon={faDatabase} className="text-xl text-gray-600 mb-1" />
                <p className="text-sm text-gray-800">{app.size ? `${app.size} MB` : 'Không rõ'}</p>
              </div>

              <div className="px-0.5 sm:px-1.5">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  {app.category === 'testflight' ? 'Lượt xem' : 'Lượt tải'}
                </p>
                <FontAwesomeIcon icon={faDownload} className="text-xl text-gray-600 mb-1" />
                <p className="text-sm text-gray-800">{app.downloads ?? 0}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-2">Mô tả</h2>
              <p className="text-gray-700 whitespace-pre-line">
                {app.description}
              </p>
            </div>

            {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow">
                <h2 className="text-lg font-bold text-gray-800 mb-3">Ảnh màn hình</h2>
                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                  {app.screenshots.map((url, i) => (
                    <div key={i} className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border">
                      <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {related.length > 0 && (
              <div className="bg-white rounded-xl p-4 shadow">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>
                <div className="divide-y divide-gray-200">
                  {related.map((item) => (
                    <Link
                      href={`/${item.slug}`}
                      key={item.id}
                      className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={item.icon_url || '/placeholder-icon.png'}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover shadow-sm"
                        />
                        <div className="flex flex-col">
                          <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {item.author && <span>{item.author}</span>}
                            {item.version && (
                              <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                                {item.version}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <FontAwesomeIcon icon={faDownload} className="text-blue-500 text-lg" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </>
  );
}