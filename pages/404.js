// pages/404.js
import Link from 'next/link';
import Layout from '../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faWrench, faLayerGroup } from '@fortawesome/free-solid-svg-icons';

export default function Custom404() {
  return (
    <Layout fullWidth>
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-950">
        <div className="text-center px-4 py-12 max-w-md">
          <h1 className="text-6xl font-bold text-gray-400 mb-4">404</h1>
          <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
            Không tìm thấy trang
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mb-8">
            App bạn tìm không tồn tại hoặc đã bị xóa.
          </p>
          
          <div className="space-y-3">
            <Link href="/" className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold">
              <FontAwesomeIcon icon={faHome} className="mr-2" />
              Về Trang Chủ
            </Link>
            
            <div className="grid grid-cols-2 gap-3 mt-6">
              <Link href="/category/jailbreak" className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-zinc-700">
                <FontAwesomeIcon icon={faWrench} className="mr-1" /> Jailbreak
              </Link>
              <Link href="/category/testflight" className="px-4 py-2 bg-gray-200 dark:bg-zinc-800 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-zinc-700">
                <FontAwesomeIcon icon={faLayerGroup} className="mr-1" /> TestFlight
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
