'use client';

import Layout from '../components/Layout';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload, faRocket, faArrowLeft, faCodeBranch,
  faDatabase, faUser, faCheckCircle, faTimesCircle, faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import { createSupabaseServer, supabase as supabaseClient } from '../lib/supabase';

/** SSR: lấy app, tự gắn slug chuyên mục, và lấy related theo category_id */
export async function getServerSideProps(ctx) {
  const supabase = createSupabaseServer(ctx);
  const slug = ctx.params.slug?.toLowerCase();

  // 1) Tìm app theo slug
  let { data: app, error } = await supabase
    .from('apps')
    .select('*')
    .ilike('slug', slug)
    .single();

  // 2) Fallback: nếu người dùng gõ thẳng id
  if ((!app || error) && slug) {
    const fb = await supabase.from('apps').select('*').eq('id', slug).single();
    if (fb.data) {
      return { redirect: { destination: `/${fb.data.slug}`, permanent: false } };
    }
    return { notFound: true };
  }

  // 3) Gắn slug chuyên mục chắc chắn (không phụ thuộc join mơ hồ)
  let serverCategorySlug = null;
  if (app?.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, slug, name')
      .eq('id', app.category_id)
      .single();
    if (cat?.slug) serverCategorySlug = cat.slug;
  }
  // fallback legacy (nếu còn cột text category)
  if (!serverCategorySlug && app?.category) serverCategorySlug = String(app.category).toLowerCase();

  // 4) Related theo category_id
  const { data: related } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version')
    .eq('category_id', app.category_id)
    .neq('id', app.id)
    .limit(10);

  return {
    props: {
      serverApp: app,
      serverRelated: related ?? [],
      serverCategorySlug: serverCategorySlug ?? null,
    },
  };
}

export default function Detail({ serverApp, serverRelated, serverCategorySlug }) {
  const router = useRouter();
  const [app, setApp] = useState(serverApp);
  const [related, setRelated] = useState(serverRelated);
  const [dominantColor, setDominantColor] = useState('#f0f2f5');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Từ SSR: xác định chắc chắn chuyên mục
  const categorySlug = serverCategorySlug;
  const isTestflight = categorySlug === 'testflight';
  const isJailbreak  = categorySlug === 'jailbreak';

  useEffect(() => {
    setApp(serverApp);
    setRelated(serverRelated);
    setShowFullDescription(false);
    setDominantColor('#f0f2f5');
  }, [router.query.slug, serverApp, serverRelated]);

  // Tăng view & check slot TestFlight + trích màu nền
  useEffect(() => {
    if (!app?.id) return;

    // 1) Tăng view cho TestFlight
    if (isTestflight) {
      fetch('/api/admin/add-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id }),
      }).catch(console.error);
    }

    // 2) Check slot TestFlight
    if (isTestflight && app.testflight_url) {
      setStatusLoading(true);
      const id = app.testflight_url.split('/').pop();
      fetch(`/api/admin/check-slot?id=${id}`)
        .then((r) => r.json())
        .then((d) => { if (d.success) setStatus(d.status); })
        .catch(console.error)
        .finally(() => setStatusLoading(false));
    }

    // 3) Màu nền từ icon
    if (app.icon_url && typeof window !== 'undefined') {
      const fac = new FastAverageColor();
      fac.getColorAsync(app.icon_url)
        .then((c) => setDominantColor(c.hex))
        .catch(console.error)
        .finally(() => fac.destroy());
    }
  }, [app?.id, app?.icon_url, app?.testflight_url, isTestflight]);

  const truncate = (t, lim) => (t?.length > lim ? t.slice(0, lim) + '...' : t);

  const handleDownload = (e) => {
    e.preventDefault();
    if (!app?.id) return;
    if (isTestflight) return; // TestFlight không tải IPA

    setIsDownloading(true);
    router.push(`/install/${app.slug}`);

    fetch(`/api/admin/add-download?id=${app.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
      .then((r) => r.json())
      .then((d) => { if (d.success) setApp((prev) => ({ ...prev, downloads: d.downloads })); })
      .catch((err) => console.error('Lỗi tăng lượt tải:', err))
      .finally(() => setIsDownloading(false));
  };

  if (!app) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Không tìm thấy ứng dụng</h1>
            <button onClick={() => router.push('/')} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Về trang chủ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout fullWidth>
      <div className="bg-gray-100 min-h-screen pb-12">
        <div className="w-full flex justify-center mt-10 bg-gray-100">
          <div className="relative w-full max-w-screen-2xl px-2 sm:px-4 md:px-6 pb-8 bg-white rounded-none">
            <div className="w-full pb-6" style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}>
              <div className="absolute top-3 left-3 z-10">
                <Link href="/" className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm">
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-10 text-center px-4">
                <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl">
                  <img src={app.icon_url || '/placeholder-icon.png'} alt={app.name} className="w-full h-full object-cover" />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-gray-900 drop-shadow">{app.name}</h1>
                {app.author && <p className="text-gray-700 text-sm">{app.author}</p>}

                <div className="mt-4 space-x-2">
                  {/* Nút TestFlight */}
                  {isTestflight && app.testflight_url && (
                    <div className="flex flex-wrap justify-center gap-2">
                      <a href={app.testflight_url} target="_blank" rel="noopener noreferrer"
                         className="inline-block border border-blue-500 text-blue-700 hover:bg-blue-100 transition px-4 py-2 rounded-full text-sm font-semibold">
                        <FontAwesomeIcon icon={faRocket} className="mr-2" />
                        Tham gia TestFlight
                      </a>

                      {statusLoading || status === null ? (
                        <span className="inline-block border border-gray-300 text-gray-500 bg-gray-50 px-4 py-2 rounded-full text-sm font-semibold">
                          Loading...
                        </span>
                      ) : status === 'Y' ? (
                        <span className="inline-block border border-green-500 text-green-700 bg-green-50 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                          Còn slot
                        </span>
                      ) : status === 'F' ? (
                        <span className="inline-block border border-red-500 text-red-700 bg-red-50 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                          Đã đầy
                        </span>
                      ) : (
                        <span className="inline-block border border-yellow-500 text-yellow-700 bg-yellow-50 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
                          Ngừng nhận
                        </span>
                      )}
                    </div>
                  )}

                  {/* Nút Jailbreak */}
                  {isJailbreak && (
                    <button
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className={`inline-block border border-green-500 text-green-700 transition px-4 py-2 rounded-full text-sm font-semibold active:scale-95 active:bg-green-200 active:shadow-inner active:ring-2 active:ring-green-500 ${
                        isDownloading ? 'opacity-50 cursor-not-allowed bg-green-100' : 'hover:bg-green-100'
                      }`}
                    >
                      {isDownloading ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-green-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Đang tải...
                        </span>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faDownload} className="mr-2" />
                          Cài đặt ứng dụng
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thông tin & Related */}
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6 space-y-6">
          <div className="bg-white rounded-xl p-4 shadow flex justify-between text-center overflow-x-auto divide-x divide-gray-200">
            <div className="px-0.5 sm:px-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tác giả</p>
              <FontAwesomeIcon icon={faUser} className="text-xl text-gray-600 mb-1" />
              <p className="text-sm text-gray-800">{app.author || 'Không rõ'}</p>
            </div>
            <div className="px-1 sm:px-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Phiên bản</p>
              <FontAwesomeIcon icon={faCodeBranch} className="text-xl text-gray-600 mb-1" />
              <p className="text-sm text-gray-800">{app.version || 'Không rõ'}</p>
            </div>
            <div className="px-1 sm:px-2">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Dung lượng</p>
              <FontAwesomeIcon icon={faDatabase} className="text-xl text-gray-600 mb-1" />
              <p className="text-sm text-gray-800">{app.size ? `${app.size} MB` : 'Không rõ'}</p>
            </div>
            <div className="px-0.5 sm:px-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">{isTestflight ? 'LƯỢT XEM' : 'Lượt tải'}</p>
              {isTestflight ? (
                <div className="flex flex-col items-center">
                  <span className="text-xl font-medium text-gray-600 mb-1">{app.views ?? 0}</span>
                  <span className="text-xs text-gray-500">Lượt</span>
                </div>
              ) : (
                <>
                  <FontAwesomeIcon icon={faDownload} className="text-xl text-gray-600 mb-1" />
                  <p className="text-sm text-gray-800">{app.downloads ?? 0}</p>
                </>
              )}
            </div>
          </div>

          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {app.screenshots.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border">
                    <img src={url} alt={`Screenshot ${i + 1}`} className="w-full h-auto object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {related.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200">
                {related.map((item) => (
                  <Link href={`/${item.slug}`} key={item.id} className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition">
                    <div className="flex items-center gap-4">
                      <img src={item.icon_url || '/placeholder-icon.png'} alt={item.name} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {item.author && <span>{item.author}</span>}
                          {item.version && <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">{item.version}</span>}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faDownload} className="text-blue-500 text-lg" />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}