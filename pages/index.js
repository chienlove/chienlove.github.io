// pages/index.js
import { useMemo, useEffect, useState, Fragment } from 'react';
import Head from 'next/head';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import Link from 'next/link';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faCheckCircle,
  faExclamationCircle,
  faFire,
  faChevronLeft,
  faChevronRight,
  faAngleLeft,
  faAngleRight,
  faChevronDown,
  faChevronUp,
  faEllipsisH,
  faExternalLinkAlt,
  faArrowRight,
  faDownload,
  faTag,
  faEye,
  faClock,
  faStar,
  faBolt,
  faCircleInfo,
  faCircleQuestion,
  faCircleExclamation
} from '@fortawesome/free-solid-svg-icons';
import { faCircleDown as faCircleDownRegular } from '@fortawesome/free-regular-svg-icons';
import { faEye as faEyeRegular } from '@fortawesome/free-regular-svg-icons';

// Affiliate tĩnh
import affiliateApps from '../lib/appads';

/* =========================
   SEO component (bổ sung, không đổi UI)
   ========================= */
const SITE = {
  name: 'StoreiOS',
  url: 'https://storeios.net',
  twitter: '@storeios',
  description:
    'StoreiOS - Tải IPA, TestFlight, jailbreak & app-clone. Ký IPA nhanh, cập nhật trạng thái chứng chỉ, bình luận và chia sẻ.',
};

function SEOIndexMeta({ meta }) {
  const title = meta?.title || 'StoreiOS -- IPA, TestFlight, jailbreak & app-clone';
  const desc = meta?.description || SITE.description;
  const url = SITE.url;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
    </Head>
  );
}

/* =========================
   Affiliate Inline Card
   ========================= */
const AffiliateInlineCard = ({ item, isFirst }) => {
  const href = item.url || item.link || '#';
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block group"
    >
      <div className="border border-blue-200/60 dark:border-blue-300/20 rounded-xl p-3 md:p-4 bg-blue-50/40 dark:bg-blue-900/10 hover:bg-blue-50/70 dark:hover:bg-blue-900/20 transition">
        <div className="text-xs text-blue-600 dark:text-blue-300 font-semibold uppercase mb-1">[Ad]</div>
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-sm md:text-base font-semibold text-gray-800 dark:text-gray-100 truncate">
              {item.title || item.name}
            </div>
            {item.desc && (
              <div className="text-[12px] md:text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                {item.desc}
              </div>
            )}
          </div>
          <div className="shrink-0 pl-3 text-blue-600 dark:text-blue-300 opacity-80 group-hover:opacity-100">
            <FontAwesomeIcon icon={faArrowRight} />
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center w-10 h-14 mt-1" />
    </a>
  );
};

/* =========================
   Metric (absolute) -- hiện ngay dưới icon tải & thẳng hàng dòng meta
   ========================= */
function MetricInlineAbsolute({ categorySlug, app }) {
  const slug = (categorySlug || '').toLowerCase();

  // Chỉ hiển thị số đếm dưới icon tải cho jailbreak/app-clone (không kèm icon).
  // Với testflight, vẫn có thể hiển thị icon con mắt (giữ nguyên hành vi cũ).
  let showIcon = false;
  let icon = null;
  let value = 0;
  if (slug === 'testflight') {
    icon = faEyeRegular;
    value = app?.views ?? 0;
    showIcon = true; // giữ icon cho testflight
  } else if (slug === 'jailbreak' || slug === 'app-clone') {
    // yêu cầu: xóa icon cạnh số đếm -> chỉ hiện số
    icon = null;
    value = app?.downloads ?? 0;
  } else {
    return null;
  }

  // Vị trí:
  // right-3/md:right-4: né sát nút tải
  // top-[52px]/md:top-[56px]: canh đúng hàng meta (author/version) trong AppCard
  // Nếu UI lệch 1–2px giữa các thiết bị, có thể tinh chỉnh 2 giá trị top này.
  return (
    <div className="absolute right-3 md:right-4 top-[56px] md:top-[60px]">
      <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-400">
        {showIcon && icon ? <FontAwesomeIcon icon={icon} /> : null}
        <span className={showIcon && icon ? 'ml-1' : ''}>
          {Number(value || 0).toLocaleString('vi-VN')}
        </span>
      </div>
    </div>
  );
}

/* =========================
   Home
   ========================= */
export default function Home({ categoriesWithApps, hotApps, paginationData, metaSEO }) {
  // Chỉ 2 chuyên mục cài IPA → hiển thị badge ký/thu hồi
  const INSTALLABLE_SLUGS = new Set(['jailbreak', 'app-clone']);

  // Trạng thái certificate (client-side, sau khi trang đã render)
  const [certStatus, setCertStatus] = useState(null);

  useEffect(() => {
    let alive = true;

    // Hoãn kiểm tra 8 giây để không ảnh hưởng cảm nhận tải trang
    const DELAY_MS = 8000;
    const timer = setTimeout(() => {
      if (!alive) return;
      fetch('/api/check-revocation')
        .then(r => (r.ok ? r.json() : Promise.reject()))
        .then(json => { if (!alive) return; setCertStatus(json); })
        .catch(() => { if (!alive) return; setCertStatus({ ocspStatus: 'error' }); });
    }, DELAY_MS);

    return () => { alive = false; clearTimeout(timer); };
  }, []);

  const multiplexIndices = new Set([1, 3]);
  const contentCard = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const adCard = contentCard;

  const AdLabel = () => (<div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>);

  // ===== SEO (không đổi UI) =====
  const seoData = useMemo(() => metaSEO || {}, [metaSEO]);

  return (
    <Layout hotApps={hotApps}>
      <SEOIndexMeta meta={seoData} />

      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* Banner Ad */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}><AdUnit className="my-0" mobileVariant="compact" /></div>
        </div>

        {/* Hot apps */}
        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-600 to-pink-600">
                Hot hôm nay
              </h2>
              <div className="text-amber-600 dark:text-amber-400">
                <FontAwesomeIcon icon={faFire} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {hotApps.map(app => (
                <div key={`hot-${app.id}`} className="relative">
                  <AppCard app={app} mode="list" />
                  {/* Có thể chèn MetricInlineAbsolute nếu muốn hiện views/download ở Hot */}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danh mục & apps */}
        {categoriesWithApps.map((category, cIdx) => {
          const pageInfo = paginationData?.[category.slug] || {};
          const hasFullPager = pageInfo?.mode === 'full' && (pageInfo?.totalPages || 1) > 1;
          const hasLitePager = pageInfo?.mode === 'lite' && pageInfo?.hasNext === true;

          return (
            <Fragment key={category.id}>
              <div className={contentCard}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                    {category.name}
                  </h2>

                  {/* Badge trạng thái cert – chỉ hiện cho jailbreak/app-clone, và chỉ sau khi có kết quả */}
                  {INSTALLABLE_SLUGS.has((category.slug || '').toLowerCase()) && certStatus && (
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

                {/* Thông tin trang (nếu có) */}
                {hasFullPager && (
                  <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-2">
                    Trang {pageInfo.currentPage} / {pageInfo.totalPages} ({pageInfo.totalApps} ứng dụng)
                  </div>
                )}

                <div>
                  {(category.appsRendered || category.apps).map((item, idx) => {
                    if (item.__isAffiliate) {
                      return (
                        <AffiliateInlineCard
                          key={`aff-${item.__affKey || item.id}`}
                          item={item}
                          isFirst={idx === 0}
                        />
                      );
                    }
                    // ✅ Bọc AppCard trong relative & chèn Metric absolute (ngay dưới icon tải)
                    return (
                      <div key={item.id} className="relative">
                        <AppCard app={item} mode="list" />
                        <MetricInlineAbsolute categorySlug={category.slug} app={item} />
                      </div>
                    );
                  })}
                </div>

                {/* Phân trang */}
                {hasFullPager && (
                  <PaginationFull
                    categorySlug={category.slug}
                    currentPage={pageInfo.currentPage || 1}
                    totalPages={pageInfo.totalPages || 1}
                  />
                )}

                {hasLitePager && (
                  <PaginationLite categorySlug={category.slug} />
                )}
              </div>

              {/* Quảng cáo multiplex chèn giữa các nhóm */}
              {multiplexIndices.has(cIdx) && (
                <div className="space-y-2">
                  <AdLabel />
                  <div className={adCard}><AdUnit type="multiplex" /></div>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
    </Layout>
  );
}

/* =========================
   Phân trang (đủ & rút gọn)
   ========================= */

function PaginationFull({ categorySlug, currentPage, totalPages }) {
  const slug = categorySlug || '';
  const base = `/category/${slug}`;
  const makeHref = (p) => `${base}?page=${p}`;

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <Link
        href={currentPage > 1 ? makeHref(currentPage - 1) : '#'}
        className={`px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
          currentPage <= 1 ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <FontAwesomeIcon icon={faAngleLeft} /> <span className="ml-1">Trang trước</span>
      </Link>

      <div className="text-gray-600 dark:text-gray-300">
        Trang <b>{currentPage}</b> / <b>{totalPages}</b>
      </div>

      <Link
        href={currentPage < totalPages ? makeHref(currentPage + 1) : '#'}
        className={`px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
          currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''
        }`}
      >
        <span className="mr-1">Trang sau</span> <FontAwesomeIcon icon={faAngleRight} />
      </Link>
    </div>
  );
}

function PaginationLite({ categorySlug }) {
  const slug = categorySlug || '';
  const href = `/category/${slug}?page=2`;
  return (
    <div className="mt-3 flex justify-center">
      <Link
        href={href}
        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
      >
        Xem thêm
      </Link>
    </div>
  );
}

/* =========================
   getServerSideProps
   ========================= */
export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);

  // Lấy categories & apps
  const { data: categoriesRow } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('position', { ascending: true });

  // Lấy apps cho mỗi category (ví dụ 6–10 app đầu)
  // (Tối ưu: bạn có thể đổi sang Edge/ISR trong App Router sau)
  const categoriesWithApps = [];
  for (const cat of categoriesRow || []) {
    const { data: apps } = await supabase
      .from('apps')
      .select('id, name, slug, icon, version, author, downloads, views, updatedAt, createdAt, category')
      .eq('category', cat.slug)
      .order('updatedAt', { ascending: false })
      .limit(10);

    categoriesWithApps.push({
      ...cat,
      apps: (apps || []).map(a => ({ ...a })),
    });
  }

  // Hot apps (ví dụ chọn theo views + downloads)
  const hotApps = (categoriesWithApps.flatMap(c => c.apps) || [])
    .slice(0, 50)
    .map(app => ({ ...app, hotScore: (app.views || 0) + (app.downloads || 0) }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 6);

  // Affiliate chen vào category cụ thể (ví dụ sau app thứ 2)
  const affInline = (affiliateApps || []).slice(0, 2).map((it, idx) => ({
    ...it,
    id: `aff-${idx + 1}`,
    __isAffiliate: true,
    __affKey: `${it.title || it.name}-${idx}`
  }));

  // Chèn aff vào category nào đó (ví dụ category đầu tiên)
  if (categoriesWithApps[0]) {
    const first = categoriesWithApps[0];
    const injected = [];
    (first.apps || []).forEach((app, idx) => {
      injected.push(app);
      if (idx === 1) injected.push(affInline[0]);
      if (idx === 3) injected.push(affInline[1]);
    });
    first.appsRendered = injected;
  }

  // Dữ liệu phân trang mẫu
  const paginationData = Object.fromEntries(
    (categoriesWithApps || []).map((c) => [
      c.slug,
      { mode: 'full', currentPage: 1, totalPages: 5, totalApps: (c.apps || []).length }
    ])
  );

  // SEO
  const metaSEO = {
    title: 'StoreiOS -- Tải IPA, TestFlight, jailbreak & app-clone',
    description: SITE.description
  };

  return {
    props: {
      categoriesWithApps,
      hotApps,
      paginationData,
      metaSEO,
    },
  };
}
