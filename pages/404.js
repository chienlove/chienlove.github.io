import Link from 'next/link';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faWrench, faRocket, faLayerGroup } from '@fortawesome/free-solid-svg-icons';
import Head from 'next/head';

const popularCategories = [
  { slug: 'jailbreak', name: 'Jailbreak', icon: faWrench },
  { slug: 'testflight', name: 'TestFlight', icon: faRocket },
  { slug: 'app-clone', name: 'App Clone', icon: faLayerGroup },
];

export default function Custom404() {
  return (
    <Layout fullWidth>
      <Head>
        <title>Không tìm thấy - StoreiOS</title>
        <meta name="robots" content="noindex, follow" />
      </Head>
      
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-950 px-4 py-12">
        <div className="text-center max-w-md">
          <h1 className="text-6xl font-bold text-gray-400 dark:text-gray-600 mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Không tìm thấy trang</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">Ứng dụng bạn tìm không tồn tại hoặc đã bị xóa.</p>
          
          <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
            <FontAwesomeIcon icon={faHome} className="mr-2" />
            Về Trang Chủ
          </Link>

          <div className="mt-8">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-4">CHUYÊN MỤC PHỔ BIẾN</h3>
            <div className="grid grid-cols-1 gap-3">
              {popularCategories.map(cat => (
                <Link key={cat.slug} href={`/category/${cat.slug}`} className="px-4 py-3 bg-gray-200 dark:bg-zinc-800 rounded-lg hover:bg-gray-300 dark:hover:bg-zinc-700 transition flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={cat.icon} className="w-4 h-4" />
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
