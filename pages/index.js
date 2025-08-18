// pages/index.js
'use client';

import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSpinner,
  faTimesCircle,
  faCheckCircle,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons';

export default function Home({ categoriesWithApps, certStatus }) {
  return (
    <Layout>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* Banner đầu trang */}
        <AdUnit mobileVariant="compact" mobileSlot1="5160182988" mobileSlot2="7109430646"
enableDesktopFallback
desktopFallbackSlot="4575220124" />

        {categoriesWithApps.map((category, index) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 pt-6 pb-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {category.name}
              </h2>

              {category.name.toLowerCase().includes('jailbreak') && (
                <span
                  className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                  title={
                    certStatus?.ocspStatus === 'successful'
                      ? certStatus.isRevoked
                        ? 'Chứng chỉ đã bị thu hồi'
                        : 'Chứng chỉ hợp lệ'
                      : 'Không thể kiểm tra'
                  }
                >
                  {certStatus?.ocspStatus === 'successful' ? (
                    certStatus.isRevoked ? (
                      <>
                        <span className="font-bold text-red-600">Revoked</span>
                        <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-green-600">Signed</span>
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                      </>
                    )
                  ) : (
                    <>
                      <span className="font-bold text-gray-500">Error</span>
                      <FontAwesomeIcon icon={faExclamationCircle} className="text-gray-400" />
                    </>
                  )}
                </span>
              )}
            </div>

            <div>
              {category.apps.map((app) => (
                <AppCard key={app.id} app={app} mode="list" />
              ))}
            </div>

            {/* Banner giữa trang: sau mỗi 2 danh mục và giới hạn để tránh dày đặc */}
            {((index + 1) % 2 === 0) && (index < 4) && (
              <AdUnit mobileVariant="Multiplex" mobileSlot1="5160182988" mobileSlot2="7109430646"
enableDesktopFallback
desktopFallbackSlot="4575220124"
/>               />
            )}
          </div>
        ))}

        {/* Banner cuối trang */}
        <AdUnit mobileVariant="compact" mobileSlot1="5160182988" mobileSlot2="7109430646"
enableDesktopFallback
desktopFallbackSlot="4575220124" />
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);
  const userAgent = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = userAgent.toLowerCase().includes('googlebot');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Giữ nguyên chế độ chỉ-admin khi đang dev
  if (!user && !isGoogleBot) {
    return {
      redirect: {
        destination: '/under-construction',
        permanent: false,
      },
    };
  }

  const { data: categories } = await supabase.from('categories').select('id, name');

  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      const { data: apps } = await supabase
        .from('apps')
        .select('*')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false });

      return {
        ...category,
        apps: apps || [],
      };
    })
  );

  // Kiểm tra chứng chỉ (giữ server-side như bạn đang dùng)
  let certStatus = null;
  try {
    const res = await fetch('https://ipadl.storeios.net/api/check-revocation');
    certStatus = await res.json();
  } catch (err) {
    certStatus = { ocspStatus: 'error' };
  }

  return {
    props: {
      categoriesWithApps,
      certStatus,
    },
  };
}