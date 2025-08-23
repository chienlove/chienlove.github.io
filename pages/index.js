import Layout from '../components/Layout';
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
  faDownload,
} from '@fortawesome/free-solid-svg-icons';

/* ========= Row renderer: hiển thị liền mạch trong 1 card ========= */
function AppRow({ app }) {
  const href = app?.slug ? `/${app.slug}` : '#';
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
    >
      {/* Icon */}
      {app?.icon_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={app.icon_url}
          alt={app.name || 'App'}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          loading="lazy"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
      )}

      {/* Texts */}
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          {app?.name || 'Ứng dụng'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {app?.author ? `Tác giả: ${app.author}` : 'Tác giả: --'} • {app?.version ? `v${app.version}` : 'v--'}
        </div>
      </div>

      {/* Download icon (chỉ minh họa thị giác) */}
      <FontAwesomeIcon
        icon={faDownload}
        className="text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
      />
    </Link>
  );
}

/* ========= Phân trang ========= */
const PaginationControls = ({ categorySlug, currentPage, totalPages }) => {
  if (!totalPages || totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
      {currentPage > 1 && (
        <Link
          href={`/?category=${categorySlug}&page=${currentPage - 1}`}
          scroll={false}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
        <Link
          key={pageNum}
          href={`/?category=${categorySlug}&page=${pageNum}`}
          scroll={false}
          className={`w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all
            ${pageNum === currentPage
              ? 'bg-red-600 text-white scale-110 shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white'}`}
        >
          {pageNum}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={`/?category=${categorySlug}&page=${currentPage + 1}`}
          scroll={false}
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      )}
    </div>
  );
};

export default function Home({ categoriesWithApps, hotApps, paginationData }) {
  const [certStatus, setCertStatus] = useState(null);

  // fetch certStatus ở client như trước
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
      } catch {
        setCertStatus({ ocspStatus: 'error' });
      }
    };
    fetchCertStatus();
  }, []);

  const contentCard =
    'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const adCard = contentCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>
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

        {/* Ứng dụng Hot */}
        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center gap-3 mb-4">
              <FontAwesomeIcon icon={faFire} className="text-2xl text-red-500" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">Ứng dụng Hot</h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Top {hotApps.length} ứng dụng được quan tâm nhất
              </div>
            </div>

            {/* Danh sách liền mạch + đường kẻ */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {hotApps.map((app) => (
                <AppRow key={app.id || app.slug || app.name} app={app} />
              ))}
            </div>
          </div>
        )}

        {/* Danh sách theo chuyên mục */}
        {categoriesWithApps.map((category) => (
          <Fragment key={category.id}>
            <div className={contentCard}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">{category.name}</h2>

                {category.name?.toLowerCase().includes('jailbreak') && certStatus && (
                  <span
                    className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300"
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

              {/* Thông tin phân trang */}
              {paginationData &&
                paginationData[category.id] &&
                paginationData[category.id].totalPages > 1 && (
                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Trang {paginationData[category.id].currentPage} /{' '}
                    {paginationData[category.id].totalPages} ({paginationData[category.id].totalApps} ứng dụng)
                  </div>
                )}

              {/* Danh sách liền mạch + đường kẻ */}
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {(category.apps || []).map((app) => (
                  <AppRow key={app.id || app.slug || app.name} app={app} />
                ))}
              </div>

              {/* Phân trang */}
              {paginationData && paginationData[category.id] && (
                <PaginationControls
                  categorySlug={category.slug}
                  currentPage={paginationData[category.id].currentPage || 1}
                  totalPages={paginationData[category.id].totalPages || 1}
                />
              )}
            </div>
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

  // Giữ logic gốc: chặn truy cập nếu chưa đăng nhập và không phải Googlebot
  if (!user && !isGoogleBot) {
    return { redirect: { destination: '/under-construction', permanent: false } };
  }

  // Tham số phân trang theo chuyên mục
  const { category: categorySlug, page: pageQuery } = ctx.query;
  const currentPage = parseInt(pageQuery || '1', 10);
  const APPS_PER_PAGE = 10;

  // Lấy chuyên mục
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug');

  const paginationData = {};

  // Lấy app theo từng chuyên mục
  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      const pageForThisCategory =
        categorySlug && category.slug === categorySlug ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;

      // Đếm tổng số app theo category_id
      const { count } = await supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id);

      const totalPages = Math.ceil((count || 0) / APPS_PER_PAGE);
      paginationData[category.id] = {
        currentPage: pageForThisCategory,
        totalPages,
        totalApps: count || 0,
      };

      // Lấy danh sách: chọn các cột cần hiển thị
      const { data: apps } = await supabase
        .from('apps')
        .select('id, name, slug, icon_url, version, author, created_at')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + APPS_PER_PAGE - 1);

      return { ...category, apps: apps || [] };
    })
  );

  // Ứng dụng Hot (tính theo views + downloads), và cũng lấy đủ cột hiển thị
  const { data: hotAppsData } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, version, author, views, downloads')
    .order('views', { ascending: false, nullsLast: true })
    .limit(10); // lấy rộng hơn để sau khi tính điểm còn top 5 tốt

  const sortedHotApps = (hotAppsData || [])
    .map((app) => ({
      ...app,
      hotScore: (app.views || 0) + (app.downloads || 0),
    }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);

  return {
    props: {
      categoriesWithApps,
      hotApps: sortedHotApps,
      paginationData,
    },
  };
}