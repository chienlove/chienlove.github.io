// pages/index.js
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

// 🔹 THÊM: import danh sách affiliate từ file tĩnh
import affiliateApps from '../lib/appads';

// --- COMPONENT CON - Pagination ---
const PaginationControls = ({ categorySlug, currentPage, totalPages }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6 flex-wrap">
      {currentPage > 1 && (
        <Link 
          href={`/?category=${categorySlug}&page=${currentPage - 1}`} 
          scroll={false} 
          className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
        >
          <FontAwesomeIcon icon={faChevronLeft} />
        </Link>
      )}
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

// App Ads
const AffiliateInlineCard = ({ item, isFirst = false }) => {
  const { name, author, icon_url, affiliate_url, payout_label } = item;

  return (
    <a
      href={affiliate_url}
      target="_blank"
      rel="nofollow sponsored noopener"
      className="flex items-start justify-between gap-3 px-2 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition rounded-lg"
    >
      {/* Icon: kích thước & lề giống AppCard */}
      <div className="relative w-14 h-14 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-1">
        <img
          src={icon_url}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {/* Badge [Ad] chéo góc trái */}
        <div className="absolute top-0 left-0 w-16 h-16 overflow-hidden z-10 pointer-events-none">
          <div className="absolute top-[6px] left-[-25px] w-[80px] rotate-[-45deg] bg-yellow-400 text-black text-[10px] font-bold text-center py-[0.5px] shadow-md">
            Ad
          </div>
        </div>
      </div>

      {/* Nội dung: border-t giống AppCard; nếu là item đầu tiên thì bỏ đường kẻ */}
      <div className={`flex-1 min-w-0 ${isFirst ? '' : 'border-t border-gray-200 dark:border-gray-700 pt-2'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold text-gray-900 dark:text-white truncate">
            {name}
          </h3>
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

      {/* Khối phải để canh lề đúng như AppCard (ô chứa icon download) */}
      <div className="flex items-center justify-center w-10 h-14 mt-1" />
    </a>
  );
};

export default function Home({ categoriesWithApps, hotApps, paginationData }) {
  const [certStatus, setCertStatus] = useState(null);

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
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Top download
              </h2>
              <FontAwesomeIcon icon={faFire} className="text-xl text-red-500" />
            </div>
            <div className="space-y-1">
              {hotApps.map((app, index) => (
                <HotAppCard key={app.id} app={app} rank={index + 1} />
              ))}
            </div>
          </div>
        )}

        {categoriesWithApps.map((category, index) => (
          <Fragment key={category.id}>
            <div className={contentCard}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
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

              {/* 🔹 CHỈ SỬA NHẸ 1 DÒNG: ưu tiên dùng appsRendered nếu có, không thì dùng apps gốc */}
              <div>
  {(category.appsRendered || category.apps).map((item, idx) => {
    return item.__isAffiliate
      ? <AffiliateInlineCard key={`aff-${item.__affKey || item.id}`} item={item} isFirst={idx === 0} />
      : <AppCard key={item.id} app={item} mode="list" />;
  })}
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

// 🔹 THÊM: helper trộn affiliate (giới hạn rất nhẹ, không ảnh hưởng pagination)
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

    // gắn flag để client render đúng component
    result.splice(Math.min(insertAt + i, result.length), 0, {
      ...aff,
      __isAffiliate: true,
      __affKey: `${aff.id || aff.affiliate_url}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      // chuẩn hoá url 1 chút (UTM)
      affiliate_url: (() => {
        try {
          const u = new URL(aff.affiliate_url);
          if (!u.searchParams.get('utm_source')) u.searchParams.set('utm_source', 'storeios');
          if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'listing');
          if (!u.searchParams.get('utm_campaign')) u.searchParams.set('utm_campaign', 'affiliate');
          return u.toString();
        } catch {
          return aff.affiliate_url;
        }
      })(),
    });
  });

  return result;
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

  const { data: categories } = await supabase.from('categories').select('id, name, slug');

  const paginationData = {};

  // ✅ lấy affiliatePool từ file tĩnh (thay vì DB)
  const affiliatePool = affiliateApps.map(a => ({ ...a }));

  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      const pageForThisCategory = (categorySlug && category.slug === categorySlug) ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;

      const { count } = await supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id);

      const totalPages = Math.ceil((count || 0) / APPS_PER_PAGE);
      paginationData[category.id] = { 
        currentPage: pageForThisCategory, 
        totalPages,
        totalApps: count || 0
      };

      const { data: apps } = await supabase
        .from('apps')
        .select('*')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + APPS_PER_PAGE - 1);

      // 🔹 trộn affiliate vào mảng hiển thị (không đổi mảng apps gốc)
      const appsRendered = interleaveAffiliate(apps || [], affiliatePool, category, {
        ratioEvery: 5,
        maxPerCategory: 2,
      });

      return { ...category, apps: apps || [], appsRendered };
    })
  );

  const { data: hotAppsData } = await supabase
    .from('apps')
    .select('*')
    .order('views', { ascending: false, nullsLast: true })
    .limit(5);

  const sortedHotApps = (hotAppsData || [])
    .map(app => ({
      ...app,
      hotScore: (app.views || 0) + (app.downloads || 0)
    }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);

  return { 
    props: { 
      categoriesWithApps: categoriesWithApps, 
      hotApps: sortedHotApps,
      paginationData
    } 
  };
}