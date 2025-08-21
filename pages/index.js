import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import AdUnit from '../components/Ads';
import { createSupabaseServer } from '../lib/supabase';
import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimesCircle,
  faCheckCircle,
  faExclamationCircle,
  faFire,
  faChevronLeft,
  faChevronRight,
  faEllipsisH,
} from '@fortawesome/free-solid-svg-icons';

// --- COMPONENT CON - Pagination ---
const PaginationControls = ({ categorySlug, currentPage, totalPages }) => {
  if (totalPages <= 1) return null;

  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Điều chỉnh lại startPage nếu endPage đã đạt tối đa
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Hiển thị trang đầu và dấu ... nếu cần
    if (startPage > 1) {
      pageNumbers.push(
        <Link
          key={1}
          href={`/?category=${categorySlug}&page=1`}
          scroll={false}
          className="w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200 bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white"
        >
          1
        </Link>
      );
      
      if (startPage > 2) {
        pageNumbers.push(
          <span key="ellipsis-start" className="w-9 h-9 flex items-center justify-center text-gray-500">
            <FontAwesomeIcon icon={faEllipsisH} />
          </span>
        );
      }
    }

    // Hiển thị các trang trong khoảng
    for (let i = startPage; i <= endPage; i++) {
      const isActive = i === currentPage;
      pageNumbers.push(
        <Link
          key={i}
          href={`/?category=${categorySlug}&page=${i}`}
          scroll={false}
          className={`
            w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200
            ${isActive
              ? 'bg-red-600 text-white scale-110 shadow-lg'
              : 'bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white'
            }
          `}
        >
          {i}
        </Link>
      );
    }

    // Hiển thị dấu ... và trang cuối nếu cần
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pageNumbers.push(
          <span key="ellipsis-end" className="w-9 h-9 flex items-center justify-center text-gray-500">
            <FontAwesomeIcon icon={faEllipsisH} />
          </span>
        );
      }
      
      pageNumbers.push(
        <Link
          key={totalPages}
          href={`/?category=${categorySlug}&page=${totalPages}`}
          scroll={false}
          className="w-9 h-9 flex items-center justify-center rounded-md text-sm font-bold transition-all duration-200 bg-gray-200 dark:bg-gray-700 hover:bg-red-500 hover:text-white"
        >
          {totalPages}
        </Link>
      );
    }

    return pageNumbers;
  };

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
      
      {/* Các số trang */}
      {renderPageNumbers()}
      
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

// --- COMPONENT CHÍNH - Home ---
export default function Home({ hotApps, categoriesWithApps, paginationData, initialCertStatus }) {
  const router = useRouter();
  const [certStatus, setCertStatus] = useState(initialCertStatus);

  // ✅ Tối ưu: Chuyển việc fetch trạng thái chứng chỉ sang client-side
  useEffect(() => {
    // Chỉ fetch lại nếu server không cung cấp được dữ liệu ban đầu
    if (!initialCertStatus) {
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
    }
  }, [initialCertStatus]);

  const multiplexIndices = new Set([0, 2]); // Chèn quảng cáo sau chuyên mục #1 và #3
  const contentCard = 'bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 py-4';
  const adCard = contentCard;

  const AdLabel = () => (
    <div className="text-sm text-gray-500 dark:text-gray-400 font-semibold px-1">
      Quảng cáo
    </div>
  );

  return (
    <Layout>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {/* Banner quảng cáo đầu trang */}
        <div className="space-y-2">
          <AdLabel />
          <div className={adCard}>
            <AdUnit className="my-0" mobileVariant="compact" />
          </div>
        </div>

        {/* 🔥 Chuyên mục Ứng dụng Hot */}
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

        {/* Các chuyên mục khác với phân trang */}
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
                      certStatus.ocspStatus === 'successful'
                        ? (certStatus.isRevoked ? 'Chứng chỉ đã bị thu hồi' : 'Chứng chỉ hợp lệ')
                        : 'Không thể kiểm tra'
                    }
                  >
                    {certStatus.ocspStatus === 'successful' ? (
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
              
              {/* Hiển thị thông tin phân trang */}
              {paginationData[category.id] && paginationData[category.id].totalPages > 1 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Trang {paginationData[category.id].currentPage} / {paginationData[category.id].totalPages} 
                  ({paginationData[category.id].totalApps} ứng dụng)
                </div>
              )}
              
              <div className="space-y-1">
                {category.apps.map((app) => (
                  <AppCard key={app.id} app={app} mode="list" />
                ))}
              </div>
              
              {/* ✅ Thêm các nút phân trang */}
              <PaginationControls
                categorySlug={category.slug}
                currentPage={paginationData[category.id]?.currentPage || 1}
                totalPages={paginationData[category.id]?.totalPages || 1}
              />
            </div>

            {/* Quảng cáo xen kẽ */}
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

        {/* Banner quảng cáo cuối trang */}
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

// --- SERVER-SIDE LOGIC ---
export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);
  const userAgent = ctx.req.headers['user-agent'] || '';
  const isGoogleBot = userAgent.toLowerCase().includes('googlebot');

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isGoogleBot) {
    return {
      redirect: { destination: '/under-construction', permanent: false },
    };
  }

  // ✅ Lấy các tham số phân trang từ URL
  const { category: categorySlug, page: pageQuery } = ctx.query;
  const currentPage = parseInt(pageQuery || '1', 10);
  const APPS_PER_PAGE = 10; // Số lượng app mỗi trang, tốt cho SEO

  // Lấy danh sách chuyên mục
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('created_at', { ascending: true });

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    // Trả về rỗng để tránh lỗi crash, nhưng vẫn hiển thị trang
    return { props: { hotApps: [], categoriesWithApps: [], paginationData: {}, initialCertStatus: null } };
  }

  const paginationData = {};

  // Lấy dữ liệu ứng dụng cho từng chuyên mục
  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      // Xác định trang hiện tại cho chuyên mục này
      // Nếu có categorySlug trong URL và nó khớp với category hiện tại, dùng currentPage từ query
      // Ngược lại, luôn bắt đầu từ trang 1 cho các chuyên mục khác
      const pageForThisCategory = (categorySlug && category.slug === categorySlug) ? currentPage : 1;
      const startIndex = (pageForThisCategory - 1) * APPS_PER_PAGE;

      // Lấy tổng số app để tính toán phân trang
      const { count, error: countError } = await supabase
        .from('apps')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', category.id);

      if (countError) {
        console.error(`Error counting apps for category ${category.name}:`, countError);
        return { ...category, apps: [] }; // Trả về chuyên mục rỗng nếu có lỗi
      }

      const totalPages = Math.ceil(count / APPS_PER_PAGE);
      paginationData[category.id] = { 
        currentPage: pageForThisCategory, 
        totalPages,
        totalApps: count 
      };

      // Lấy danh sách app cho trang hiện tại
      const { data: apps, error: appsError } = await supabase
        .from('apps')
        .select('id, name, slug, icon_url, author, version, category_id, views, downloads') // Chỉ chọn các cột cần thiết
        .eq('category_id', category.id)
        .order('created_at', { ascending: false })
        .range(startIndex, startIndex + APPS_PER_PAGE - 1);

      if (appsError) {
        console.error(`Error fetching apps for category ${category.name}:`, appsError);
        return { ...category, apps: [] }; // Trả về chuyên mục rỗng nếu có lỗi
      }

      return { ...category, apps: apps || [] };
    })
  );

  // ✅ Lấy 5 ứng dụng hot nhất (dựa trên lượt xem + tải)
  // Sử dụng trực tiếp các cột views và downloads có sẵn
  const { data: hotAppsData, error: hotAppsError } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version, category_id, views, downloads')
    .order('views', { ascending: false, nullsFirst: true })
    .order('downloads', { ascending: false, nullsLast: true })
    .limit(5);

  if (hotAppsError) {
    console.error('Error fetching hot apps:', hotAppsError);
    // Tiếp tục với hotApps rỗng nếu có lỗi
    hotAppsData = []; 
  }

  // Sắp xếp lại theo tổng điểm (views + downloads)
  const sortedHotApps = (hotAppsData || [])
    .map(app => ({
      ...app,
      hotScore: (app.views || 0) + (app.downloads || 0)
    }))
    .sort((a, b) => b.hotScore - a.hotScore)
    .slice(0, 5); // Đảm bảo chỉ lấy 5 ứng dụng hàng đầu

  // ✅ Tối ưu: Fetch certStatus ở server, nhưng không chặn render nếu lỗi
  let initialCertStatus = null;
  try {
    const res = await fetch('https://ipadl.storeios.net/api/check-revocation', {
      signal: AbortSignal.timeout(2000) // Thêm timeout 2 giây để tránh chờ quá lâu
    });
    if (res.ok) {
      initialCertStatus = await res.json();
    } else {
      initialCertStatus = { ocspStatus: 'error', message: `HTTP Error: ${res.status}` };
    }
  } catch (error) {
    console.error('Could not fetch cert status on server:', error.name, error.message);
    initialCertStatus = { ocspStatus: 'error', message: error.message }; // Đặt trạng thái lỗi
  }

  return {
    props: {
      hotApps: sortedHotApps,
      categoriesWithApps,
      paginationData,
      initialCertStatus,
    },
  };
}


