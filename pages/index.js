// pages/index.js
import { useEffect, useState, Fragment } from 'react';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimesCircle, faCheckCircle } from '@fortawesome/free-solid-svg-icons';

export default function Home({ categoriesWithApps }) {
  // OCSP: chạy ở client, timeout ngắn; nếu lỗi thì ẩn luôn badge (không show "Error")
  const [certOk, setCertOk] = useState(null); // true/false/null (null = không hiển thị)
  useEffect(() => {
    let aborted = false;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 1200);
    (async () => {
      try {
        const res = await fetch('https://ipadl.storeios.net/api/check-revocation', {
          signal: ctrl.signal, cache: 'no-store'
        });
        const j = await res.json();
        if (!aborted && j?.ocspStatus === 'successful') {
          setCertOk(!j.isRevoked);
        }
        // nếu không successful -> để null (ẩn badge)
      } catch {
        if (!aborted) setCertOk(null);
      } finally {
        clearTimeout(t);
      }
    })();
    return () => { aborted = true; ctrl.abort(); clearTimeout(t); };
  }, []);

  // Chèn Multiplex sau section #2 & #4
  const multiplexIndices = new Set([1, 3]);
  const card = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const AdLabel = () => <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>;

  return (
    <Layout categories={categoriesWithApps.map(c => ({ id: c.id, name: c.name }))}>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">

        {/* Banner đầu */}
        <div className="space-y-2">
          <AdLabel />
          <div className={card}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {/* Danh sách theo chuyên mục */}
        {categoriesWithApps.map((category, idx) => (
          <Fragment key={category.id}>
            <div className={card}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{category.name}</h2>
                {/* Chỉ hiện badge khi check thành công */}
                {certOk !== null && category.name.toLowerCase().includes('jailbreak') && (
                  <span className="flex items-center gap-2 text-sm">
                    {certOk ? (
                      <>
                        <span className="font-bold text-green-600">Signed</span>
                        <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" />
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-red-600">Revoked</span>
                        <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                      </>
                    )}
                  </span>
                )}
              </div>

              <div>
                {category.apps.map(app => <AppCard key={app.id} app={app} mode="list" />)}
              </div>
            </div>

            {multiplexIndices.has(idx) && (
              <div className="space-y-2">
                <AdLabel />
                <div className={card}>
                  <AdUnit className="my-0" mobileVariant="multiplex" />
                </div>
              </div>
            )}
          </Fragment>
        ))}

        {/* Banner cuối */}
        <div className="space-y-2">
          <AdLabel />
          <div className={card}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);

  // (giữ logic under-construction nếu cần)
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  const ua = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = ua.toLowerCase().includes('googlebot');
  if (!user && !isGoogleBot) {
    return { redirect: { destination: '/under-construction', permanent: false } };
  }

  // 1) Lấy categories 1 lần
  const { data: categories = [] } = await supabase
    .from('categories')
    .select('id, name');

  const ids = categories.map(c => c.id);

  // 2) Lấy toàn bộ apps theo các category_id trong **1 query**
  const { data: allApps = [] } = await supabase
    .from('apps')
    .select('*')
    .in('category_id', ids)
    .order('created_at', { ascending: false });

  // Group ở server
  const grouped = new Map(ids.map(id => [id, []]));
  for (const a of allApps) {
    if (grouped.has(a.category_id)) grouped.get(a.category_id).push(a);
  }
  const categoriesWithApps = categories.map(c => ({ ...c, apps: grouped.get(c.id) || [] }));

  return { props: { categoriesWithApps } };
}