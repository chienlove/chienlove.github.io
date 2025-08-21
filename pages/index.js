// pages/index.js
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import { Fragment, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faCheckCircle,
  faExclamationCircle,
  faBolt,
  faFire,
  faRocket
} from '@fortawesome/free-solid-svg-icons';

export default function Home({ categoriesWithApps, trendingApps, stats }) {
  // ── OCSP: chuyển sang client để không chặn TTFB
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

  // ── Chèn Multiplex sau section chuyên mục #2 và #4 (index 1 và 3)
  const multiplexIndices = new Set([1, 3]);

  const sectionCard =
    'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';

  const adCard = sectionCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>
  );

  return (
    <Layout categories={categoriesWithApps?.map(c => ({ id: c.id, name: c.name }))}>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">

        {/* ─────────────────────── HERO ─────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-100 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 shadow-md">
          <div className="relative z-10 px-5 md:px-10 py-8 md:py-12">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                  Kho TestFlight & Jailbreak <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-rose-400">hiện đại</span>
                </h1>
                <p className="mt-2 text-gray-600 dark:text-gray-300 max-w-2xl">
                  Khám phá app beta qua TestFlight, công cụ jailbreak chọn lọc, cập nhật liên tục. Tối ưu tốc độ tải và trải nghiệm mượt.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <a
                    href="/categories/testflight"
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 bg-black text-white dark:bg-white dark:text-black font-semibold hover:opacity-90 active:scale-95"
                  >
                    <FontAwesomeIcon icon={faRocket} />
                    App TestFlight
                  </a>
                  <a
                    href="/categories/jailbreak"
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-100 font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95"
                  >
                    <FontAwesomeIcon icon={faBolt} />
                    Công cụ Jailbreak
                  </a>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500">Ứng dụng</p>
                  <p className="text-xl font-bold mt-1">{stats.totalApps}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500">Chuyên mục</p>
                  <p className="text-xl font-bold mt-1">{stats.totalCategories}</p>
                </div>
                <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-center">
                  <p className="text-xs font-semibold text-gray-500">Tổng tải</p>
                  <p className="text-xl font-bold mt-1">{stats.totalDownloads}</p>
                </div>
              </div>
            </div>
          </div>

          {/* hiệu ứng nền nhẹ */}
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-10 w-64 h-64 rounded-full bg-rose-500/10 blur-3xl" />
        </section>

        {/* ───────────────── "XU HƯỚNG HÔM NAY" ─────────────── */}
        {trendingApps?.length > 0 && (
          <section className={sectionCard}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FontAwesomeIcon icon={faFire} className="text-red-500" />
                Xu hướng hôm nay
              </h2>
              <span className="text-xs text-gray-500">Xếp theo lượt xem/tải</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {trendingApps.map(app => (
                <AppCard key={app.id} app={app} mode="card" />
              ))}
            </div>
          </section>
        )}

        {/* ─────────────── Banner Ads đầu trang ─────────────── */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {/* ────────────────── Danh sách theo chuyên mục ────────────────── */}
        {categoriesWithApps.map((category, index) => (
          <Fragment key={category.id}>
            <div className={sectionCard}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{category.name}</h2>

                {/* Huy hiệu chứng chỉ dành cho category jailbreak */}
                {category.name.toLowerCase().includes('jailbreak') && (
                  <span
                    className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 cursor-default"
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

            {/* Multiplex giữa các section */}
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

        {/* Banner Ads cuối trang */}
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
  const supabase = createSupabaseServer(ctx);
  const ua = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = ua.toLowerCase().includes('googlebot');

  // Nếu bạn vẫn muốn chặn khách chưa login như bản cũ
  const { data: { user } = { user: null } } = await supabase.auth.getUser();
  if (!user && !isGoogleBot) {
    return { redirect: { destination: '/under-construction', permanent: false } };
  }

  // 1) Lấy categories
  const { data: categories = [] } = await supabase
    .from('categories')
    .select('id, name');

  const catIds = categories.map(c => c.id);

  // 2) Lấy toàn bộ apps trong 1 lần, rồi group theo category_id
  const { data: allApps = [] } = await supabase
    .from('apps')
    .select('*')
    .in('category_id', catIds)
    .order('created_at', { ascending: false });

  const grouped = new Map(catIds.map(id => [id, []]));
  allApps.forEach(app => {
    if (grouped.has(app.category_id)) grouped.get(app.category_id).push(app);
  });

  const categoriesWithApps = categories.map(c => ({
    ...c,
    apps: grouped.get(c.id) || []
  }));

  // ── Xu hướng: score = views (TestFlight) | downloads (Jailbreak)
  const scored = allApps
    .map(a => ({
      ...a,
      _score: a.category === 'testflight' ? (a.views || 0) : (a.downloads || 0)
    }))
    .sort((x, y) => y._score - x._score);

  const trendingApps = scored.slice(0, 8).map(({ _score, ...rest }) => rest);

  // ── Stats cho Hero
  const stats = {
    totalApps: allApps.length,
    totalCategories: categories.length,
    totalDownloads: allApps.reduce((sum, a) => sum + (a.downloads || 0), 0)
  };

  return { props: { categoriesWithApps, trendingApps, stats } };
}