// pages/index.js (ĐÃ SỬA HOÀN CHỈNH - TỐI ƯU TỐC ĐỘ + ẨN API CHECK)
import { useMemo, useEffect, useState, Fragment, useRef } from 'react';
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
  faCaretDown,
} from '@fortawesome/free-solid-svg-icons';

import affiliateApps from '../lib/appads';

/* =========================
   SEO
   ========================= */
const SITE = {
  name: 'StoreiOS',
  url: 'https://storeios.net',
  twitter: '@storeios',
};

const APP_FIELDS = [
  'id',
  'name',
  'slug',
  'icon_url',
  'author',
  'version',
  'views',
  'installs',
  'downloads',
  'category_id',
  'created_at',
].join(',');

const CATEGORY_SEO = {
  testflight: {
    title: 'StoreiOS – Ứng dụng TestFlight cho iOS',
    description: 'Tổng hợp các ứng dụng TestFlight cho iPhone/iPad, cập nhật slot thường xuyên. Theo dõi link TestFlight còn chỗ, dễ cài đặt và an toàn.',
  },
  jailbreak: {
    title: 'StoreiOS – Ứng dụng Jailbreak & tiện ích iOS',
    description: 'Kho ứng dụng Jailbreak và tiện ích iOS đã ký, cập nhật thường xuyên. Hướng dẫn an toàn, cài đặt nhanh, theo dõi chứng chỉ Signed/Revoked.',
  },
  'app-clone': {
    title: 'StoreiOS – App Clone (nhân bản) cho iOS',
    description: 'App Clone (nhân bản) cho iOS: cài song song nhiều tài khoản, tối ưu cho mạng xã hội và công việc. Đã ký sẵn, dễ cài đặt.',
  },
  'app-removed': {
    title: 'StoreiOS – Ứng dụng đã gỡ khỏi App Store (Signed IPA)',
    description: 'Tổng hợp ứng dụng iOS đã gỡ khỏi App Store nhưng vẫn có thể cài đặt qua IPA đã ký. Cập nhật thường xuyên, cài đặt nhanh, an toàn.',
  },
};

function buildCanonical({ categorySlug, page }) {
  const base = SITE.url;
  if (!categorySlug && (!page || page <= 1)) return `${base}/`;
  if (!categorySlug && page > 1) return `${base}/?page=${page}`;
  if (categorySlug && (!page || page <= 1)) return `${base}/?category=${encodeURIComponent(categorySlug)}`;
  return `${base}/?category=${encodeURIComponent(categorySlug)}&page=${page}`;
}

function titleFromNameOrSlug(categoryName, categorySlug) {
  if (CATEGORY_SEO[categorySlug]) return CATEGORY_SEO[categorySlug].title;
  if (categoryName) return `StoreiOS – ${categoryName}`;
  if (categorySlug) return `StoreiOS – ${categorySlug} cho iOS`;
  return 'StoreiOS – Ứng dụng iOS, TestFlight, Jailbreak';
}

function descFromSlugOrDefault(categorySlug, fallback) {
  return CATEGORY_SEO[categorySlug]?.description || fallback;
}

function SEOIndexMeta({ meta }) {
  const {
    page = 1,
    totalPages = 1,
    categorySlug = null,
    categoryName = null,
    description: defaultDesc = 'Tải ứng dụng iOS, TestFlight, jailbreak và hướng dẫn an toàn. Cập nhật hằng ngày.',
  } = meta || {};

  const slug = (categorySlug || '').toLowerCase();
  const titleBase = titleFromNameOrSlug(categoryName, slug);
  const desc = descFromSlugOrDefault(slug, defaultDesc);
  const title = page > 1 ? `${titleBase} (Trang ${page})` : titleBase;

  const canonical = buildCanonical({ categorySlug: slug || null, page });
  const prevUrl = page > 1 ? buildCanonical({ categorySlug: slug || null, page: page - 1 }) : null;
  const nextUrl = page < totalPages ? buildCanonical({ categorySlug: slug || null, page: page + 1 }) : null;

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
      'query-input': 'required name=query',
    },
  };

  const jsonLdBreadcrumb = slug
    ? {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Trang chủ', item: SITE.url },
          {
            '@type': 'ListItem',
            position: 2,
            name:
              CATEGORY_SEO[slug]?.title?.replace(/^StoreiOS –\s*/, '') ||
              categoryName ||
              (slug.charAt(0).toUpperCase() + slug.slice(1)),
            item: buildCanonical({ categorySlug: slug, page: 1 }),
          },
        ],
      }
    : null;

  const jsonLdCollection = slug
    ? {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: titleBase,
        description: desc,
        url: canonical,
        isPartOf: SITE.url,
      }
    : null;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {prevUrl && <link rel="prev" href={prevUrl} />}
      {nextUrl && <link rel="next" href={nextUrl} />}
      <meta name="robots" content="index,follow,max-image-preview:large" />
      <meta name="googlebot" content="index,follow" />
      <meta name="theme-color" content="#111111" />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={`${SITE.url}/og-default.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={`${SITE.url}/og-default.jpg`} />

      <link rel="alternate" hrefLang="vi" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {supabaseOrigin && <link rel="dns-prefetch" href={supabaseOrigin} />}
      {supabaseOrigin && <link rel="preconnect" href={supabaseOrigin} crossOrigin="" />}
      <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebsite) }} />
      {jsonLdBreadcrumb && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }} />
      )}
      {jsonLdCollection && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdCollection) }} />
      )}
    </Head>
  );
}

/* =========================
   Pagination components (giữ nguyên)
   ========================= */
function PaginationFull({ categorySlug, currentPage, totalPages }) {
  // ... giữ nguyên hoàn toàn
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
      {currentPage > 1 && <PageBtn p={1} aria="Về trang đầu" />}
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

      {pages.map((p, i) => (
        <Fragment key={`${p}-${i}`}>
          <PageBtn p={p} />
        </Fragment>
      ))}

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
      {currentPage < totalPages && <PageBtn p={totalPages} aria="Tới trang cuối" />}
    </nav>
  );
}

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
   Metric + HotAppCard + Affiliate (giữ nguyên)
   ========================= */
function MetricInlineAbsolute({ categorySlug, app, forceKey }) {
  const slug = (categorySlug || '').toLowerCase();
  let value = 0;
  if (forceKey === 'views') value = app?.views ?? 0;
  else if (forceKey === 'installs') value = app?.installs ?? 0;
  else if (slug === 'testflight') value = app?.views ?? 0;
  else if (['jailbreak', 'app-clone', 'app-removed'].includes(slug)) value = app?.installs ?? 0;
  else return null;

  return (
    <div className="absolute right-2 md:right-2 top-[62px] w-10 text-center" style={{ zIndex: 10 }}>
      <div className="text-[12px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
        <span className="font-bold">{Number(value || 0).toLocaleString('vi-VN')}</span>
      </div>
    </div>
  );
}

const HotAppCard = ({ app, rank, hotMode }) => {
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
      <MetricInlineAbsolute app={app} forceKey={hotMode} />
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

/* =========================
   Home Component
   ========================= */
export default function Home({ 
  categoriesWithApps, 
  hotByInstalls, 
  hotByViews, 
  paginationData, 
  metaSEO,
  certStatus: initialCertStatus   // ← nhận từ server
}) {
  const INSTALLABLE_SLUGS = new Set(['jailbreak', 'app-clone', 'app-removed']);
  const [hotMode, setHotMode] = useState('installs');
  const [hotMenuOpen, setHotMenuOpen] = useState(false);
  const hotMenuRef = useRef(null);

  // Dùng initial từ server, nếu chưa có thì null → badge sẽ ẩn cho đến khi có dữ liệu
  const [certStatus, setCertStatus] = useState(initialCertStatus || null);

  // Fallback: nếu server lỗi, vẫn thử fetch client 1 lần nữa (dự phòng)
  useEffect(() => {
    if (!certStatus) {
      let alive = true;
      fetch('/api/check-revocation')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(json => { if (alive && json?.success !== false) setCertStatus(json); })
        .catch(() => { if (alive) setCertStatus({ ocspStatus: 'error' }); });
      return () => { alive = false; };
    }
  }, [certStatus]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (hotMenuRef.current && !hotMenuRef.current.contains(e.target)) setHotMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const contentCard = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const adCard = contentCard;

  const AdLabel = () => (
    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 text-xs md:text-sm text-gray-500 dark:text-gray-400 font-semibold bg-white dark:bg-gray-800" style={{ zIndex: 1 }}>
      Quảng cáo
    </div>
  );

  const AdWrapper = ({ children }) => (
    <div className="relative">
      <AdLabel />
      <div className={`${adCard} pt-4`}>{children}</div>
    </div>
  );

  const seoData = useMemo(() => metaSEO || {}, [metaSEO]);
  const hotApps = hotMode === 'views' ? hotByViews : hotByInstalls;

  return (
    <Layout hotApps={hotByInstalls}>
      <SEOIndexMeta meta={seoData} />

      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        <AdWrapper>
          <AdUnit className="my-0" mobileVariant="compact" desktopMode="unit" />
        </AdWrapper>

        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                  Top download
                </h2>
                <FontAwesomeIcon icon={faFire} className="text-xl text-red-500" />
              </div>

              <div className="relative" ref={hotMenuRef}>
                <button
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700"
                  onClick={() => setHotMenuOpen(v => !v)}
                >
                  {hotMode === 'installs' ? (
                    <> <FontAwesomeIcon icon={faDownload} /> Cài nhiều </>
                  ) : (
                    <> <FontAwesomeIcon icon={faEye} /> Xem nhiều </>
                  )}
                  <FontAwesomeIcon icon={faCaretDown} className="opacity-80" />
                </button>

                {hotMenuOpen && (
                  <div className="absolute right-0 mt-2 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden z-10">
                    <button className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${hotMode==='installs' ? 'font-bold' : ''}`}
                      onClick={() => { setHotMode('installs'); setHotMenuOpen(false); }}>
                      <FontAwesomeIcon icon={faDownload} /> Cài nhiều
                    </button>
                    <button className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${hotMode==='views' ? 'font-bold' : ''}`}
                      onClick={() => { setHotMode('views'); setHotMenuOpen(false); }}>
                      <FontAwesomeIcon icon={faEye} /> Xem nhiều
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1">
              {hotApps.map((app, index) => (
                <HotAppCard key={`${hotMode}-${app.id}`} app={app} rank={index + 1} hotMode={hotMode} />
              ))}
            </div>
          </div>
        )}

        {categoriesWithApps.map((category, index) => {
          const pageInfo = paginationData?.[category.id];
          const hasFullPager = !!pageInfo?.totalPages && pageInfo.totalPages > 1 && pageInfo.mode === 'full';
          const hasLitePager = pageInfo?.mode === 'lite' && pageInfo?.hasNext === true;
          const isInstallableCategory = ['jailbreak', 'app-clone', 'app-removed'].includes((category.slug || '').toLowerCase());

          return (
            <Fragment key={category.id}>
              <div className={contentCard}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
                    {category.name}
                  </h2>

                  {/* Badge chỉ hiện khi đã có certStatus */}
                  {isInstallableCategory && certStatus && (
                    <span className="flex items-center gap-1 text-sm text-gray-700 dark:text-gray-300 transition-opacity duration-300">
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

                {hasFullPager && (
                  <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-2">
                    Trang {pageInfo.currentPage} / {pageInfo.totalPages} ({pageInfo.totalApps} ứng dụng)
                  </div>
                )}

                <div>
                  {(category.appsRendered || category.apps).map((item, idx) => {
                    if (item.__isAffiliate) {
                      return <AffiliateInlineCard key={`aff-${item.__affKey || item.id}`} item={item} isFirst={idx === 0} />;
                    }
                    return (
                      <div key={item.id} className="relative">
                        <AppCard app={item} mode="list" />
                        <MetricInlineAbsolute categorySlug={category.slug} app={item} />
                      </div>
                    );
                  })}
                </div>

                {hasFullPager && (
                  <PaginationFull categorySlug={category.slug} currentPage={pageInfo.currentPage || 1} totalPages={pageInfo.totalPages || 1} />
                )}
                {hasLitePager && <PaginationLite categorySlug={category.slug} hasNext={true} />}
              </div>

              {[1, 3].includes(index) && (
                <AdWrapper>
                  <AdUnit className="my-0" mobileVariant="multiplex" desktopMode="unit" />
                </AdWrapper>
              )}
            </Fragment>
          );
        })}

        <AdWrapper>
          <AdUnit className="my-0" mobileVariant="compact" desktopMode="unit" />
        </AdWrapper>
      </div>
    </Layout>
  );
}

/* =========================
   Helper: Check certificate (server-side)
   ========================= */
async function checkCertificateStatus() {
  try {
    const res = await fetch('https://storeios.net/api/check-revocation', { 
      headers: { 'Cache-Control': 'no-store' },
      next: { revalidate: 300 } // cache 5 phút nếu dùng ISR (tùy bạn)
    });
    if (!res.ok) return { ocspStatus: 'error' };
    const data = await res.json();
    return data.success !== false ? data : { ocspStatus: 'error' };
  } catch (err) {
    return { ocspStatus: 'error' };
  }
}

/* =========================
   getServerSideProps (đã thêm certStatus)
   ========================= */
export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);
  ctx.res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  const { category: categorySlug, page: pageQuery } = ctx.query;
  const activeSlug = typeof categorySlug === 'string' ? categorySlug.toLowerCase() : null;
  const currentPage = parseInt(pageQuery || '1', 10);
  const APPS_PER_PAGE = 10;

  const [categoriesData, hotByViewsData, hotByInstallsData] = await Promise.all([
    supabase.from('categories').select('id, name, slug'),
    supabase.from('apps').select(APP_FIELDS).order('views', { ascending: false, nullsLast: true }).limit(5),
    supabase.from('apps').select(APP_FIELDS).order('installs', { ascending: false, nullsLast: true }).limit(5),
  ]);

  const categories = categoriesData.data || [];
  const paginationData = {};
  const affiliatePool = affiliateApps.map(a => ({ ...a }));

  const categoriesWithApps = await Promise.all(
    categories.map(async (category) => {
      const catSlug = (category.slug || '').toLowerCase();
      const isActive = activeSlug && catSlug === activeSlug;
      const pageForThisCategory = isActive ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;
      const endIndex = startIndex + APPS_PER_PAGE - 1;

      if (isActive) {
        const [{ count }, { data: apps }] = await Promise.all([
          supabase.from('apps').select('id', { count: 'estimated', head: true }).eq('category_id', category.id),
          supabase.from('apps').select(APP_FIELDS).eq('category_id', category.id)
            .order('created_at', { ascending: false })
            .range(startIndex, endIndex),
        ]);

        const totalApps = count || 0;
        const totalPages = Math.max(1, Math.ceil(totalApps / APPS_PER_PAGE));
        paginationData[category.id] = { mode: 'full', currentPage: pageForThisCategory, totalPages, totalApps };

        const appsRendered = interleaveAffiliate(apps || [], affiliatePool, category, { ratioEvery: 5, maxPerCategory: 2 });
        return { ...category, apps: apps || [], appsRendered };
      } else {
        const { data: appsPlusOne } = await supabase.from('apps')
          .select(APP_FIELDS)
          .eq('category_id', category.id)
          .order('created_at', { ascending: false })
          .range(0, APPS_PER_PAGE);

        const hasNext = (appsPlusOne?.length || 0) > APPS_PER_PAGE;
        const apps = (appsPlusOne || []).slice(0, APPS_PER_PAGE);

        paginationData[category.id] = {
          mode: hasNext ? 'lite' : 'none',
          currentPage: 1,
          totalPages: hasNext ? 2 : 1,
          hasNext,
        };

        const appsRendered = interleaveAffiliate(apps, affiliatePool, category, { ratioEvery: 5, maxPerCategory: 2 });
        return { ...category, apps, appsRendered };
      }
    })
  );

  const hotByViews = (hotByViewsData.data || []).slice(0, 5);
  const hotByInstalls = (hotByInstallsData.data || []).slice(0, 5);

  // SEO
  let metaSEO = { page: 1, totalPages: 1, categorySlug: null, categoryName: null, description: 'Kho ứng dụng TestFlight beta & công cụ jailbreak cho iOS' };
  if (activeSlug) {
    const activeCat = categories.find(c => (c.slug || '').toLowerCase() === activeSlug);
    const pageInfo = activeCat ? paginationData[activeCat.id] : null;
    if (activeCat) {
      metaSEO = {
        page: pageInfo?.currentPage || 1,
        totalPages: pageInfo?.totalPages || 1,
        categorySlug: activeSlug,
        categoryName: activeCat.name || null,
        description: CATEGORY_SEO[activeSlug]?.description || `Kho ứng dụng ${activeCat.name} cho iOS`
      };
    }
  }

  // CHECK CERTIFICATE TRÊN SERVER → KHÔNG HIỆN TRONG NETWORK
  const certStatus = await checkCertificateStatus();

  return {
    props: {
      categoriesWithApps,
      hotByInstalls,
      hotByViews,
      paginationData,
      metaSEO,
      certStatus,   // ← thêm vào đây
    }
  };
}