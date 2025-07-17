'use client';

import { createSupabaseServer } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdBanner from '../components/AdBanner'; // ✅ Banner ngang thủ công

export default function Home({ categoriesWithApps }) {
  return (
    <Layout>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">

        {/* ✅ Quảng cáo đầu trang (728x90) */}
        <AdBanner />

        {categoriesWithApps.map((category, index) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 pt-6 pb-2"
          >
            <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
              {category.name}
            </h2>

            {/* Hiển thị danh sách ứng dụng */}
            <div>
              {category.apps.map((app) => (
                <AppCard key={app.id} app={app} mode="list" />
              ))}
            </div>

            {/* ✅ Quảng cáo sau mỗi category thứ 2 */}
            {(index + 1) % 2 === 0 && <AdBanner />}
          </div>
        ))}

        {/* ✅ Quảng cáo cuối trang */}
        <AdBanner />
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

  return {
    props: {
      categoriesWithApps,
    },
  };
}