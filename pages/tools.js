// pages/tools.js
import Head from 'next/head';
import Layout from '../components/Layout';

export default function ToolsPage() {
  const title = 'Công cụ iOS – StoreiOS';
  const description =
    'Danh sách công cụ hỗ trợ iOS trên StoreiOS: xem thông tin app, tải IPA hợp pháp và các tiện ích kỹ thuật khác cho cộng đồng iOS.';
  const url = 'https://storeios.net/tools';

  const tools = [
    {
      name: 'App Info',
      url: 'https://appinfo.storeios.net',
      badge: 'External',
      desc: 'Xem thông tin chi tiết của ứng dụng iOS: bundle id, phiên bản, kích thước…',
      icon: '📱',
    },
    {
      name: 'IPA Downloader',
      url: 'https://ipadl.storeios.net',
      badge: 'External',
      desc: 'Tải file IPA từ App Store một cách hợp pháp để phục vụ ký và cài đặt.',
      icon: '📦',
    },
    // sau này bạn thêm tool khác thì chỉ cần push thêm vào đây
  ];

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">Công cụ iOS trên StoreiOS</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Đây là những công cụ kỹ thuật do StoreiOS vận hành hoặc giới thiệu, phục vụ việc ký và
          cài đặt ứng dụng iOS <strong>hợp pháp</strong>. Chúng tôi không chia sẻ hack, crack,
          mod, cheat hay phần mềm độc hại.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {tools.map((tool) => (
            <a
              key={tool.name}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-2xl">
                    {tool.icon}
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {tool.name}
                  </h2>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold">
                  {tool.badge}
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">
                {tool.desc}
              </p>
            </a>
          ))}
        </div>
      </main>
    </Layout>
  );
}