// pages/index.js
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import { Fragment, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

export default function Home({ categoriesWithApps }) {
  // OCSP state: dời sang client để không chặn TTFB
  const [certStatus, setCertStatus] = useState(null);

  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1500);

    (async () => {
      try {
        const res = await fetch('https://ipadl.storeios.net/api/check-revocation', {
          signal: ctrl.signal,
          cache: 'no-store',
        });
        if (!aborted) setCertStatus(await res.json());
      } catch {
        if (!aborted) setCertStatus({ ocspStatus: 'error' });
      } finally {
        clearTimeout(t);
      }
    })();

    return () => { aborted = true; clearTimeout(t); ctrl.abort(); };
  }, []);

  // Chèn Multiplex sau card #2 và #4 (index 1 và 3)
  const multiplexIndices = new Set([1, 3]);

  const contentCard =
    'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const adCard = contentCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>
  );

  return (
    <Layout categories={categoriesWithApps?.map(c => ({ id: c.id, name: c.name }))}>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* Banner trên */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {categoriesWithApps.map((category, index) => (
          <Fragment key={category.id}>
            <div className={contentCard}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{category.name}</h2>

                {category.name.toLowerCase().includes('jailbreak') && (
                  <span
                    className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-pointer"
                    title={
                      certStatus?.ocspStatus === 'successful'
                        ? (certStatus.isRevoked ? 'Chứng chỉ đã bị thu hồi' : 'Chứng chỉ hợp lệ')
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
            </div>

            {/* Multiplex giữa trang */}
            {multiplexIndices.has(index) && (
              <div className="space-y-2">
                <AdLabel />
                <div className={adCard}>
                  <AdUnit className="my-0" mobileVariant="multiplex" />
                </div>
              </div>
            )}
          </Fragment>
        ))}

        {/* Banner cuối */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx); // dùng server client chuẩn [oai_citation:3‡supabase.js](file-service://file-PUPqddvLUwfXwshEJmAKD1)

  // Chạy song song: auth + categories
  const [userRes, categoriesRes] = await Promise.all([
    supabase.auth.getUser(),                           // nếu cần chặn truy cập, vẫn giữ logic cũ (nhưng song song)
    supabase.from('categories').select('id, name')     // 1 query lấy categories
  ]);

  const user = userRes?.data?.user || null;

  // Nếu bạn vẫn muốn chặn người chưa đăng nhập (giống bản cũ) → giữ nguyên:
  const ua = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = ua.toLowerCase().includes('googlebot');
  if (!user && !isGoogleBot) {
    return { redirect: { destination: '/under-construction', permanent: false } };
  }

  const categories = categoriesRes.data || [];
  const ids = categories.map(c => c.id);

  // 1 query lấy TẤT CẢ apps theo category_id
  const { data: allApps } = await supabase
    .from('apps')
    .select('*')
    .in('category_id', ids)
    .order('created_at', { ascending: false });

  // Group apps theo category_id
  const grouped = new Map(ids.map(id => [id, []]));
  (allApps || []).forEach(a => {
    if (grouped.has(a.category_id)) grouped.get(a.category_id).push(a);
  });

  const categoriesWithApps = categories.map(c => ({
    ...c,
    apps: grouped.get(c.id) || []
  }));

  return { props: { categoriesWithApps } };
}