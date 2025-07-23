'use client';

import { useEffect, useState } from 'react';
import { createSupabaseServer } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdBanner from '../components/AdBanner';

export default function Home({ categoriesWithApps }) {
  const [revoked, setRevoked] = useState(null); // null: loading

  useEffect(() => {
    fetch('https://ipadl.storeios.net/api/check-revocation')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRevoked(data.isRevoked);
        } else {
          setRevoked('error');
        }
      })
      .catch(() => setRevoked('error'));
  }, []);

  return (
    <Layout>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        <AdBanner />

        {categoriesWithApps.map((category, index) => (
          <div
            key={category.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 pt-6 pb-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                {category.name}
              </h2>

              {/* Hiện trạng thái nếu là chuyên mục Jailbreak */}
              {category.name.toLowerCase().includes('jailbreak') && (
                <div
                  className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer"
                  title={
                    revoked === null
                      ? 'Đang kiểm tra chứng chỉ...'
                      : revoked === true
                      ? 'Chứng chỉ đã bị thu hồi'
                      : revoked === false
                      ? 'Chứng chỉ hợp lệ'
                      : 'Không thể kiểm tra'
                  }
                >
                  {revoked === null ? (
                    <i className="fas fa-spinner fa-spin text-yellow-500" />
                  ) : revoked === true ? (
                    <i className="fas fa-times-circle text-red-500" />
                  ) : revoked === false ? (
                    <i className="fas fa-check-circle text-green-500" />
                  ) : (
                    <i className="fas fa-exclamation-circle text-gray-400" />
                  )}
                </div>
              )}
            </div>

            <div>
              {category.apps.map((app) => (
                <AppCard key={app.id} app={app} mode="list" />
              ))}
            </div>

            {(index + 1) % 2 === 0 && <AdBanner />}
          </div>
        ))}

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