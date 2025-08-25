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

export default function Home({ categoriesWithApps, hotApps, paginationData }) {
  const [certStatus, setCertStatus] = useState(null);

  // ✅ Tối ưu: Chuyển việc fetch trạng thái chứng chỉ sang client-side
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

  // Chèn Multiplex sau card #2 và #4 (index 1 và 3) - GIỮ NGUYÊN TỪ CODE GỐC
  const multiplexIndices = new Set([1, 3]);

  // Card nội dung - GIỮ NGUYÊN TỪ CODE GỐC
  const contentCard =
    'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';

  // Card quảng cáo: dùng chung style với content - GIỮ NGUYÊN TỪ CODE GỐC
  const adCard = contentCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">
      Quảng cáo
    </div>
  );

  return (
    <Layout hotApps={hotApps}>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* ── Banner đầu trang: GỘP label + card vào 1 nhóm để không bị "xa" - GIỮ NGUYÊN TỪ CODE GỐC */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {/* 🔥 Chuyên mục Ứng dụng Hot - THÊM MỚI */}
        {hotApps && hotApps.length > 0 && (
          <div className={contentCard}>
            <div className="flex items-center gap-3 mb-4">
              <h2 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">Top download
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

        {/* LOGIC CHÍNH TỪ CODE GỐC - HOÀN TOÀN GIỮ NGUYÊN */}
        {categoriesWithApps.map((category, index) => (
          <Fragment key={category.id}>
            {/* Card chuyên mục */}
            <div className={contentCard}>
              <div className="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-green-500">
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

              {/* Hiển thị thông tin phân trang - THÊM MỚI */}
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

              {/* ✅ Thêm các nút phân trang - THÊM MỚI */}
              {paginationData && paginationData[category.id] && (
                <PaginationControls
                  categorySlug={category.slug}
                  currentPage={paginationData[category.id].currentPage || 1}
                  totalPages={paginationData[category.id].totalPages || 1}
                />
              )}
            </div>

            {/* ── Multiplex giữa trang: GỘP label + card vào 1 nhóm - GIỮ NGUYÊN TỪ CODE GỐC */}
            {multiplexIndices.has(index) && (
              <div className="space-y-2">
                <AdLabel />
                <div className={adCard}>
    <AdUnit
      className="my-0"
    mobileVariant="multiplex"
    />
                </div>
              </div>
            )}
          </Fragment>
        ))}

        {/* ── Banner cuối trang: GỘP label + card - GIỮ NGUYÊN TỪ CODE GỐC */}
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

  // Flow gốc giữ nguyên - GIỮ NGUYÊN TỪ CODE GỐC
  if (!user && !isGoogleBot) {
    return {
      redirect: { destination: '/under-construction', permanent: false },
    };
  }

  // ✅ Lấy các tham số phân trang từ URL - THÊM MỚI
  const { category: categorySlug, page: pageQuery } = ctx.query;
  const currentPage = parseInt(pageQuery || '1', 10);
  const APPS_PER_PAGE = 10; // Số lượng app mỗi trang, tốt cho SEO

  // LOGIC GỐC - GIỮ NGUYÊN HOÀN TOÀN
  const { data: categories } = await supabase.from('categories').select('id, name, slug');

  const paginationData = {};

  // LOGIC GỐC - CHỈ THÊM PHÂN TRANG
  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      // Xác định trang hiện tại cho chuyên mục này - THÊM MỚI
      const pageForThisCategory = (categorySlug && category.slug === categorySlug) ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;

      // Lấy tổng số app để tính toán phân trang - THÊM MỚI
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

      // LOGIC GỐC - CHỈ THÊM RANGE CHO PHÂN TRANG
      const { data: apps } = await supabase
        .from('apps')
        .select('*') // GIỮ NGUYÊN SELECT * TỪ CODE GỐC
        .eq('category_id', category.id)
        .order('created_at', { ascending: false }) // GIỮ NGUYÊN ORDER TỪ CODE GỐC
        .range(startIndex, startIndex + APPS_PER_PAGE - 1); // CHỈ THÊM RANGE

      return { ...category, apps: apps || [] }; // GIỮ NGUYÊN RETURN TỪ CODE GỐC
    })
  );

  // ✅ Lấy 5 ứng dụng hot nhất - THÊM MỚI
  const { data: hotAppsData } = await supabase
    .from('apps')
    .select('*')
    .order('views', { ascending: false, nullsLast: true })
    .limit(5);

  // Sắp xếp lại theo tổng điểm (views + downloads) - THÊM MỚI
  const sortedHotApps = (hotAppsData || [])
    .map(app => ({
      ...app,
      hotScore: (app.views || 0) + (app.downloads || 0)
    }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5);

  return { 
    props: { 
      categoriesWithApps, 
      hotApps: sortedHotApps,
      paginationData
    } 
  };
}