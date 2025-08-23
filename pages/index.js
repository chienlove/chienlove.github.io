import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faCheckCircle,
  faExclamationCircle,
  faFire,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

// --- COMPONENT CON - Pagination ---
const PaginationControls = ({ categorySlug, currentPage, totalPages }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
      {/* Nút Previous */}
      {currentPage > 1 && (
        <Link
          href={`/?category=${categorySlug}&page=${currentPage - 1}`}
          scroll={false}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
      )}

      {/* Hiển thị số trang */}
      {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map((pageNum) => (
        <Link
          key={pageNum}
          href={`/?category=${categorySlug}&page=${pageNum}`}
          scroll={false}
          className={`
            w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200
            ${pageNum === currentPage
              ? 'bg-red-600 text-white scale-110 shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white'
            }
          `}
        >
          {pageNum}
        </Link>
      ))}

      {/* Nút Next */}
      {currentPage < totalPages && (
        <Link
          href={`/?category=${categorySlug}&page=${currentPage + 1}`}
          scroll={false}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      )}
    </div>
  );
};

// --- COMPONENT CON - Hot App Card ---
const HotAppCard = ({ app, rank }) => {
  const rankColors = [
    'from-red-600 to-orange-500', // #1
    'from-orange-500 to-amber-400', // #2
    'from-amber-400 to-yellow-300', // #3
    'from-blue-500 to-sky-400', // #4
    'from-sky-400 to-cyan-300', // #5
  ];
  const rankColor = rankColors[rank - 1] || 'from-gray-500 to-gray-400';

  return (
    <div className="relative">
      <AppCard app={app} mode="list" />
      <div
        className={`absolute top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center
                   bg-gradient-to-br ${rankColor} text-white font-extrabold text-lg
                   shadow-lg border-2 border-white dark:border-gray-800
                   transform -rotate-12 z-10`}
      >
        {rank}
      </div>
    </div>
  );
};

export default function Home({ categoriesWithApps, hotApps, paginationData }) {
  const [certStatus, setCertStatus] = useState(null);

  // ✅ Check cert client-side
  useEffect(() => {
    const fetchCertStatus = async () => {
      try {
        const res = await fetch('https://ipadl.storeios.net/api/check-revocation');
        if (res.ok) {
          const data = await res.json();
          setCertStatus(data);
        } else {
          setCertStatus({ ocspStatus: 'error' });
        }
      } catch (error) {
        console.error('Error fetching cert status:', error);
        setCertStatus({ ocspStatus: 'error' });
      }
    };

    fetchCertStatus();
  }, []);

  const multiplexIndices = new Set([1, 3]);

  const contentCard =
    'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';

  const adCard = contentCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">
      Quảng cáo
    </div>
  );

  return (
    <Layout hotApps={hotApps}>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* Banner đầu */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {/* 🔥 Ứng dụng Hot */}
        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center gap-3 mb-4">
              <FontAwesomeIcon icon={faFire} className="text-2xl text-red-500" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Ứng dụng Hot
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Top {hotApps.length} ứng dụng được quan tâm nhất
              </div>
            </div>
            <div className="space-y-1">
              {hotApps.map((app, index) => (
                <HotAppCard key={app.id} app={app} rank={index + 1} />
              ))}
            </div>
          </div>
        )}

        {/* Danh sách theo chuyên mục */}
        {categoriesWithApps.map((category, index) => (
          <Fragment key={category.id}>
            <div className={contentCard}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                  {category.name}
                </h2>

                {category.name.toLowerCase().includes('jailbreak') && certStatus && (
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

              {paginationData && paginationData[category.id] && paginationData[category.id].totalPages > 1 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Trang {paginationData[category.id].currentPage} / {paginationData[category.id].totalPages}
                  ({paginationData[category.id].totalApps} ứng dụng)
                </div>
              )}

              <div>
                {category.apps.map((app) => (
                  <AppCard key={app.id} app={app} mode="list" />
                ))}
              </div>

              {paginationData && paginationData[category.id] && (
                <PaginationControls
                  categorySlug={category.slug}
                  currentPage={paginationData[category.id].currentPage || 1}
                  totalPages={paginationData[category.id].totalPages || 1}
                />
              )}
            </div>

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
  const supabase = createSupabaseServer(ctx);
  const userAgent = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = userAgent.toLowerCase().includes('googlebot');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isGoogleBot) {
    return {
      redirect: { destination: '/under-construction', permanent: false },
    };
  }

  const { category: categorySlug, page: pageQuery } = ctx.query;
  const currentPage = parseInt(pageQuery || '1', 10);
  const APPS_PER_PAGE = 10;

  // ✅ JOIN trực tiếp categories với apps
  const { data: categoriesWithApps, error } = await supabase
    .from('categories')
    .select(`
      id,
      name,
      slug,
      apps:apps (
        id,
        name,
        slug,
        icon_url,
        author,
        version,
        downloads,
        views,
        created_at
      )
    `)
    .order('created_at', { foreignTable: 'apps', ascending: false });

  if (error) {
    console.error('Lỗi khi fetch categoriesWithApps:', error);
    return { props: { categoriesWithApps: [], hotApps: [], paginationData: {} } };
  }

  const paginationData = {};
  const paginatedCategories = (categoriesWithApps || []).map((category) => {
    const allApps = category.apps || [];
    const pageForThisCategory =
      categorySlug && category.slug === categorySlug ? currentPage : 1;
    const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;
    const pagedApps = allApps.slice(startIndex, startIndex + APPS_PER_PAGE);

    const totalPages = Math.ceil(allApps.length / APPS_PER_PAGE);
    paginationData[category.id] = {
      currentPage: pageForThisCategory,
      totalPages,
      totalApps: allApps.length,
    };

    return { ...category, apps: pagedApps };
  });

  // Hot apps
  const { data: hotAppsData } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, downloads, views')
    .order('views', { ascending: false, nullsLast: true })
    .limit(20);

  const sortedHotApps = (hotAppsData || [])
    .map((app) => ({
      ...app,
      hotScore: (app.views || 0) + (app.downloads || 0),
    }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);

  return {
    props: {
      categoriesWithApps: paginatedCategories,
      hotApps: sortedHotApps,
      paginationData,
    },
  };
}