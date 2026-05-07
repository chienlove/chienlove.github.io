// pages/tools/index.js
import Head from 'next/head';
import Layout from '../../components/Layout';

export default function ToolsPage() {
  const title = 'Công cụ iOS – Ký IPA, TestFlight, TrollStore | StoreiOS';
  const description =
    'Tổng hợp công cụ iOS hữu ích: TrollInstallerX, eSign, Sideloadly, Filza… hỗ trợ ký IPA, cài ứng dụng thử nghiệm và quản lý hệ thống an toàn.';
  const url = 'https://storeios.net/tools';

  const tools = [
    {
      name: 'TrollInstallerX',
      desc: 'Công cụ cài TrollStore nhanh và ổn định cho iOS 14 – 16.6.1.',
      icon: '🧩',
    },
    {
      name: 'eSign',
      desc: 'Ứng dụng ký file IPA trực tiếp trên iPhone, không cần máy tính.',
      icon: '✍️',
    },
    {
      name: 'Sideloadly',
      desc: 'Cài IPA qua máy tính bằng Apple ID, hỗ trợ Windows & macOS.',
      icon: '💻',
    },
    {
      name: 'Filza File Manager',
      desc: 'Trình quản lý file mạnh mẽ cho iOS, phù hợp người dùng nâng cao.',
      icon: '📂',
    },
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

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">🛠 Công cụ iOS hữu ích</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Bộ công cụ giúp bạn quản lý file, ký ứng dụng IPA, cài TrollStore, cài app thử nghiệm
          và tối ưu thiết bị iOS một cách hợp pháp và an toàn.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-6 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl transition-all cursor-default"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-xl">
                  {tool.icon}
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {tool.name}
                </h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {tool.desc}
              </p>
            </div>
          ))}
        </div>
      </main>
    </Layout>
  );
}