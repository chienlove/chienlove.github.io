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
  faEye,
  faDownload,
  faCircleDown
} from '@fortawesome/free-solid-svg-icons';
import { faCircleDown as faCircleDownRegular } from '@fortawesome/free-regular-svg-icons';
import { faEye as faEyeRegular } from '@fortawesome/free-regular-svg-icons';

// Affiliate tĩnh
import affiliateApps from '../lib/appads';

/* =========================
   SEO component (giữ nguyên)
   ========================= */
const SITE = {
  name: 'StoreiOS',
  url: 'https://storeios.net',
  twitter: '@storeios'
};

function SEOIndexMeta({ meta }) {
  const {
    page = 1,
    totalPages = 1,
    categorySlug = null,
    description = 'Tải ứng dụng iOS, TestFlight, jailbreak và hướng dẫn an toàn. Cập nhật hằng ngày.',
  } = meta || {};

  // Điều chỉnh Title và Canonical để phù hợp với việc xử lý params category/page
  const titleBase = categorySlug
    ? `StoreiOS – ${categorySlug} cho iOS`
    : 'StoreiOS – Ứng dụng iOS, TestFlight, Jailbreak';
  const title = page > 1 ? `${titleBase} (Trang ${page})` : titleBase;

  // Xử lý Canonical URL: Chuyển path: /?category=slug&page=p thành path: /?category=slug&page=p
  let canonical = SITE.url;
  let params = new URLSearchParams();
  if (categorySlug) params.set('category', encodeURIComponent(categorySlug));
  if (page > 1) params.set('page', page);

  if (params.toString()) {
    canonical = `${SITE.url}/?${params.toString()}`;
  }

  // Xử lý Prev/Next URL
  const getUrl = (cat, p) => {
    let pms = new URLSearchParams();
    if (cat) pms.set('category', encodeURIComponent(cat));
    if (p > 1) pms.set('page', p);
    return pms.toString() ? `${SITE.url}/?${pms.toString()}` : SITE.url;
  }

  const prevUrl = page > 1 ? getUrl(categorySlug, page - 1) : null;
  const nextUrl = page < totalPages ? getUrl(categorySlug, page + 1) : null;

  // Supabase origin để preconnect (giữ nguyên)
  let supabaseOrigin = null;
  try {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseOrigin = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin;
    }
  } catch {}

  const jsonLdWebsite = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name,
    url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/search?q={query}`,
      'query-input': 'required name=query'
    }
  };

  return (
    <Head>
      {/* Title & basic meta */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <meta name="googlebot" content="index,follow" />
      <meta name="theme-color" content="#111111" />

      {/* Open Graph */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${SITE.url}/og-default.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${SITE.url}/og-default.jpg`} />

      {/* Hreflang */}
      <link rel="alternate" hrefLang="vi" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Performance */}
      {supabaseOrigin && <link rel="dns-prefetch" href={supabaseOrigin} />}
      {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      {/* JSON‑LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }}
      />
    </Head>
  );
}

/* =========================
   Pagination components (giữ nguyên)
   ========================= */

// Full pagination (cho category đang active)
function PaginationFull({ categorySlug, currentPage, totalPages }) {
  if (!totalPages || totalPages <= 1) return null;

  const windowSize = 2;
  const pages = [];
  const add = (p) => pages.push(p);

  add(1);
  const start = Math.max(2, currentPage - windowSize);
  const end = Math.min(totalPages - 1, currentPage + windowSize);
  if (start > 2) add('...');
  for (let p = start; p <= end; p++) add(p);
  if (end < totalPages - 1) add('...');
  if (totalPages > 1) add(totalPages);

  const PageBtn = ({ p, aria }) => {
    if (p === '...') return <span className="px-2 text-gray-500 select-none">…</span>;
    const active = p === currentPage;
    return (
      <Link
        prefetch={false}
        href={`/?category=${categorySlug}&page=${p}`}
        scroll={false}
        aria-label={aria || `Tới trang ${p}`}
        className={[
          'px-2.5 h-8 min-w-[2rem] inline-flex items-center justify-center rounded-md text-[13px] font-semibold transition-colors',
          active
            ? 'bg-red-600 text-white shadow'
            : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-red-500 hover:text-white'
        ].join(' ')}
      >
        {p}
      </Link>
    );
  };

  return (
    <nav className="flex items-center justify-center gap-1.5 mt-4 flex-wrap" aria-label="Phân trang">
      {currentPage > 1 && (
        <PageBtn p={1} aria="Về trang đầu" />
      )}
      {currentPage > 1 && (
        <Link
          prefetch={false}
          href={`/?category=${categorySlug}&page=${currentPage - 1}`}
          scroll={false}
          aria-label="Trang trước"
          className="px-2.5 h-8 inline-flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
      )}

      {pages.map((p, i) => <Fragment key={`${p}-${i}`}><PageBtn p={p} /></Fragment>)}

      {currentPage < totalPages && (
        <Link
          prefetch={false}
          href={`/?category=${categorySlug}&page=${currentPage + 1}`}
          scroll={false}
          aria-label="Trang sau"
          className="px-2.5 h-8 inline-flex items-center justify-center rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FontAwesomeIcon icon={faChevronRight} />
        </Link>
      )}
      {currentPage < totalPages && (
        <PageBtn p={totalPages} aria="Tới trang cuối" />
      )}
    </nav>
  );
}

// Lite pagination (cho category không active)
function PaginationLite({ categorySlug, hasNext }) {
  if (!hasNext) return null;
  return (
    <nav className="flex items-center justify-center mt-4">
      <Link
        prefetch={false}
        href={`/?category=${categorySlug}&page=2`}
        scroll={false}
        aria-label="Xem trang tiếp"
        className="px-3 h-8 inline-flex items-center justify-center rounded-md text-[13px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 hover:bg-red-500 hover:text-white transition-colors"
      >
        Trang sau <FontAwesomeIcon icon={faChevronRight} className="ml-1" />
      </Link>
    </nav>
  );
}

/* =========================
   Hot App Card, Affiliate Inline Card, Metric Inline Absolute (giữ nguyên)
   ========================= */

const HotAppCard = ({ app, rank }) => {
  const rankColors = [
    'from-red-600 to-orange-500',
    'from-orange-500 to-amber-400',
    'from-amber-400 to-yellow-300',
    'from-blue-500 to-sky-400',
    'from-sky-400 to-cyan-300',
  ];
  const rankColor = rankColors[rank - 1] || 'from-gray-500 to-gray-400';

  return (
    <div className="relative">
      <AppCard app={app} mode="list" />
      <div
        className={`absolute top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center
                   bg-gradient-to-br ${rankColor} text-white font-extrabold text-sm
                   shadow-lg border-2 border-white dark:border-gray-800
                   transform -rotate-12 z-10`}
      >
        {rank}
      </div>
    </div>
  );
};

const AffiliateInlineCard = ({ item, isFirst = false }) => {
  const { name, author, icon_url, affiliate_url, payout_label } = item;
  return (
    <a
      href={affiliate_url}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="flex items-start justify-between gap-3 px-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition rounded-lg"
    >
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-1">
        <img src={icon_url} alt={name} className="w-full h-full object-cover" loading="lazy" />
        <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden z-10 pointer-events-none">
          <div className="absolute top-[6px] left-[-25px] w-[80px] rotate-[-45deg] bg-yellow-400 text-black text-[10px] font-bold text-center py-[0.5px] shadow-md">Ad</div>
        </div>
      </div>
      <div className={`flex-1 min-w-0 ${isFirst ? '' : 'border-t border-gray-200 dark:border-gray-700 pt-2'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
          {payout_label && (
            <span className="ml-2 bg-gray-200 dark:bg-gray-700 dark:text-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
              {payout_label}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 truncate">
            <span>{author || 'Đối tác / Sponsored'}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center w-10 h-14 mt-1" />
    </a>
  );
};

function MetricInlineAbsolute({ categorySlug, app }) {
  const slug = (categorySlug || '').toLowerCase();

  let value = 0;
  if (slug === 'testflight') {
    value = app?.views ?? 0;
  } else if (slug === 'jailbreak' || slug === 'app-clone') {
    value = app?.downloads ?? 0;
  } else {
    return null;
  }

  return (
    <div 
      className="absolute right-2 md:right-2 top-[62px] w-10 text-center" 
      style={{ zIndex: 10 }} 
    >
      <div className="text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
        <span className="font-bold">{Number(value || 0).toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );
}


/* =========================
   Home component (giữ nguyên)
   ========================= */
export default function Home({ categoriesWithApps, hotApps, paginationData, metaSEO }) {
  // Chỉ 2 chuyên mục cài IPA → hiển thị badge ký/thu hồi
  const INSTALLABLE_SLUGS = new Set(['jailbreak', 'app-clone']);

  // Trạng thái certificate (client-side, sau khi trang đã render)
  const [certStatus, setCertStatus] = useState(null);

  useEffect(() => {
    let alive = true;
    
    // Tối ưu: Loại bỏ setTimeout và logic ép về 'error' sớm.
    fetch('/api/check-revocation')
      .then(r => (r.ok ? r.json() : Promise.reject()))
      .then(json => {
        if (!alive) return;
        setCertStatus(json);
      })
      .catch(() => {
        if (!alive) return;
        setCertStatus({ ocspStatus: 'error' });
      });
      // Không cần .finally()

    return () => { alive = false; };
  }, []);

  const multiplexIndices = new Set([1, 3]);
  const contentCard = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
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
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Top download</h2>
              <FontAwesomeIcon icon={faFire} className="text-xl text-red-500" />
            </div>
            <div className="space-y-1">
              {hotApps.map((app, index) => (<HotAppCard key={app.id} app={app} rank={index + 1} />))}
            </div>
          </div>
        )}

        {/* Categories */}
        {categoriesWithApps.map((category, index) => {
          const pageInfo = paginationData?.[category.id];
          const hasFullPager = !!pageInfo?.totalPages && pageInfo.totalPages > 1 && pageInfo.mode === 'full';
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
                  <PaginationLite
                    categorySlug={category.slug}
                    hasNext={true}
                  />
                )}
              </div>

              {new Set([1, 3]).has(index) && (
                <div className="space-y-2">
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>
                  <div className={contentCard}><AdUnit className="my-0" mobileVariant="multiplex" /></div>
                </div>
              )}
            </Fragment>
          );
        })}

        {/* Footer Ad */}
        <div className="space-y-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">Quảng cáo</div>
          <div className={contentCard}><AdUnit className="my-0" mobileVariant="compact" /></div>
        </div>
      </div>
    </Layout>
  );
}

/* =========================
   Affiliate interleave (giữ nguyên)
   ========================= */
function interleaveAffiliate(apps, affiliatePool, category, {
  ratioEvery = 5,
  maxPerCategory = 2,
}) {
  const result = [...(apps || [])];
  if (!affiliatePool || affiliatePool.length === 0) return result;

  const matched = affiliatePool.filter(a => {
    const slug = (a.category_slug || '').toLowerCase();
    return slug ? slug === (category.slug || '').toLowerCase() : true;
  });

  const want = Math.min(Math.max(0, Math.round((apps?.length || 0) / ratioEvery)), maxPerCategory);
  const shuffled = [...matched].sort(() => Math.random() - 0.5).slice(0, want);

  shuffled.forEach((aff, i) => {
    const posMin = Math.min(apps.length, 2);
    const posMax = Math.max(apps.length - 1, 0);
    const insertAt = apps.length <= 2
      ? apps.length
      : Math.floor(Math.random() * (posMax - posMin + 1)) + posMin;

    result.splice(Math.min(insertAt + i, result.length), 0, {
      ...aff,
      __isAffiliate: true,
      __affKey: `${aff.id || aff.affiliate_url}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      affiliate_url: (() => {
        try {
          const u = new URL(aff.affiliate_url);
          if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'storeios');
          if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'listing');
          if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'affiliate');
          return u.toString();
        } catch { return aff.affiliate_url; }
      })(),
    });
  });

  return result;
}

/* =========================
   getStaticPaths (MỚI) - Tối ưu cho Static Generation của Category và Page
   ========================= */
export async function getStaticPaths() {
  const supabase = createSupabaseServer({ req: {}, res: {} }); // Cần context rỗng cho build

  // Lấy danh sách tất cả categories
  const { data: categories } = await supabase
    .from('categories')
    .select('id, slug');

  const APPS_PER_PAGE = 10;
  let paths = [];

  // 1. Path cho Trang Chủ (URL: /)
  // params rỗng hoặc chỉ có page='1'
  paths.push({ params: {} }); 

  // 2. Paths cho Category và Phân trang (URL: /?category=slug&page=p)
  await Promise.all((categories || []).map(async (category) => {
    // Chỉ tạo paths cho category có slug
    if (!category.slug) return; 
    
    // Đếm tổng số ứng dụng để tính totalPages
    const { count } = await supabase
      .from('apps')
      .select('*', { count: 'estimated', head: true })
      .eq('category_id', category.id);

    const totalPages = Math.max(1, Math.ceil((count || 0) / APPS_PER_PAGE));

    // Build trước trang 1 của mỗi category
    paths.push({ params: { category: category.slug, page: '1' } });

    // Build trước một số trang đầu (ví dụ: 5 trang) để cải thiện tốc độ ban đầu
    for (let i = 2; i <= Math.min(totalPages, 5); i++) {
      paths.push({ params: { category: category.slug, page: String(i) } });
    }
  }));

  // fallback: 'blocking' là RẤT QUAN TRỌNG:
  // Nếu người dùng truy cập trang chưa được build (vd: page=6), Next.js sẽ SSR nó 
  // (phải đợi DB, nhưng chỉ 1 lần) rồi cache nó. Các lần sau sẽ tức thì.
  // Paths là rỗng để không build quá nhiều page khi build time, phụ thuộc vào on-demand.
  return { 
    paths: [], 
    fallback: 'blocking' 
  };
}


/* =========================
   getStaticProps (TỐI ƯU) - Thay thế getServerSideProps
   ========================= */
export async function getStaticProps({ params }) {
  // Thay đổi cách lấy context do không còn là SSR
  const supabase = createSupabaseServer({ req: {}, res: {} });
  const APPS_PER_PAGE = 10;

  // Lấy tham số từ URL (dạng /?category=slug&page=p)
  // Nếu params.category tồn tại, nghĩa là chúng ta đang ở trang Category hoặc Phân trang
  const categorySlug = params?.category || null;
  const currentPage = parseInt(params?.page || '1', 10);
  const activeSlug = categorySlug ? categorySlug.toLowerCase() : null;

  // 1. Khởi tạo tất cả các truy vấn DB còn lại song song (Giữ nguyên)
  const [categoriesData, hotAppsData] = await Promise.all([ 
    supabase.from('categories').select('id, name, slug'), 
    supabase.from('apps') 
      .select('*') 
      .order('views', { ascending: false, nullsLast: true }) 
      .limit(5) 
  ]);

  const categories = categoriesData.data; 

  const paginationData = {};
  const affiliatePool = affiliateApps.map(a => ({ ...a }));

  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      const catSlug = (category.slug || '').toLowerCase();
      // isActive chỉ true khi catSlug khớp với slug từ URL params VÀ page > 0
      const isActive = activeSlug && catSlug === activeSlug && currentPage > 0;

      const pageForThisCategory = isActive ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;
      const endIndex = startIndex + APPS_PER_PAGE - 1;

      if (isActive) {
        // Gộp count và data apps cho category active thành song song (Giữ nguyên)
        const [{ count }, { data: apps }] = await Promise.all([ 
          supabase.from('apps').select('*', { count: 'estimated', head: true }).eq('category_id', category.id), 
          supabase.from('apps').select('*') 
            .eq('category_id', category.id) 
            .order('created_at', { ascending: false }) 
            .range(startIndex, endIndex) 
        ]);

        const totalApps = count || 0;
        const totalPages = Math.max(1, Math.ceil(totalApps / APPS_PER_PAGE));
        paginationData[category.id] = {
          mode: 'full',
          currentPage: pageForThisCategory,
          totalPages,
          totalApps,
        };

        const appsRendered = interleaveAffiliate(apps || [], affiliatePool, category, {
          ratioEvery: 5,
          maxPerCategory: 2,
        });

        // Nếu trang không hợp lệ (currentPage > totalPages) HOẶC không có apps
        // Có thể redirect 404 hoặc trả về trang 1
        if (pageForThisCategory > totalPages || apps.length === 0) {
           // Nếu là trang không hợp lệ, trả về notFound: true
           // Dùng logic riêng để tránh lỗi, ví dụ: 
           // Nếu page > 1 và không có data, redirect 404 (chỉ có thể trong SSR)
           // Trong ISR, ta chỉ có thể trả về notFound
           if (pageForThisCategory > 1 && totalPages > 0) {
               return { notFound: true };
           }
        }

        return { ...category, apps: apps || [], appsRendered };
      } else {
        // Chế độ 'lite' cho các categories không active (Giữ nguyên)
        const { data: appsPlusOne } = await supabase 
          .from('apps') 
          .select('*') 
          .eq('category_id', category.id) 
          .order('created_at', { ascending: false }) 
          .range(0, APPS_PER_PAGE); 

        const hasNext = (appsPlusOne?.length || 0) > APPS_PER_PAGE;
        const apps = (appsPlusOne || []).slice(0, APPS_PER_PAGE);

        paginationData[category.id] = {
          mode: hasNext ? 'lite' : 'none',
          currentPage: 1,
          totalPages: hasNext ? 2 : 1,
          totalApps: undefined,
          hasNext,
        };

        const appsRendered = interleaveAffiliate(apps, affiliatePool, category, {
          ratioEvery: 5,
          maxPerCategory: 2,
        });

        return { ...category, apps, appsRendered };
      }
    })
  );

  const sortedHotApps = (hotAppsData.data || [])
    .map(app => ({ ...app, hotScore: (app.views || 0) + (app.downloads || 0) }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);

  // Lọc ra các mục bị lỗi notFound nếu có
  const filteredCategoriesWithApps = categoriesWithApps.filter(c => !c.notFound);
  
  // Kiểm tra nếu trang hiện tại bị notFound (chỉ xảy ra với isActive=true)
  if (categoriesWithApps.some(c => c.notFound)) {
      return { notFound: true, revalidate: 300 };
  }

  // ====== Chuẩn bị meta SEO động cho Index ======
  let metaSEO = { page: 1, totalPages: 1, categorySlug: null };
  if (activeSlug) {
    const activeCat = (categories || []).find(c => (c.slug || '').toLowerCase() === activeSlug);
    const pageInfo = activeCat ? paginationData[activeCat.id] : null;
    metaSEO = {
      page: pageInfo?.currentPage || 1,
      totalPages: pageInfo?.totalPages || 1,
      categorySlug: activeSlug,
    };
  }

  return {
    props: {
      categoriesWithApps: filteredCategoriesWithApps,
      hotApps: sortedHotApps,
      paginationData,
      metaSEO,
    },
    revalidate: 300,
  };
}
