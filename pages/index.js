// pages/index.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';
import Image from 'next/image';
import { createClient } from '@supabase/supabase-js';

/* ===================== SEO component (inline) ===================== */
const SITE = {
  name: 'StoreiOS',
  url: 'https://storeios.net',
  twitter: '@storeios' // cập nhật nếu khác
};

function SEOIndexMeta({ page = 1, total = 0, pageSize = 24, supabaseOrigin, description }) {
  const title =
    page > 1
      ? `StoreiOS – Ứng dụng iOS, TestFlight, Jailbreak (Trang ${page})`
      : 'StoreiOS – Ứng dụng iOS, TestFlight, Jailbreak';
  const desc =
    description ||
    'Tải ứng dụng iOS, TestFlight, jailbreak và hướng dẫn an toàn. Cập nhật hằng ngày.';

  const canonical = `${SITE.url}${page > 1 ? `/?page=${page}` : ''}`;
  const totalPages = Math.max(1, Math.ceil((total || 0) / (pageSize || 24)));
  const prevUrl = page > 1 ? `${SITE.url}/?page=${page - 1}` : null;
  const nextUrl = page < totalPages ? `${SITE.url}/?page=${page + 1}` : null;

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
      <meta name="description" content={desc} />
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
      <meta property="og:description" content={desc} />
      <meta property="og:image" content={`${SITE.url}/og-default.jpg`} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content={SITE.twitter} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={`${SITE.url}/og-default.jpg`} />

      {/* Hreflang */}
      <link rel="alternate" hrefLang="vi" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={canonical} />

      {/* Performance hints */}
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

/* ===================== Helpers ===================== */
function classNames(...a) {
  return a.filter(Boolean).join(' ');
}

function shortNumber(n) {
  if (n == null) return '0';
  const x = Number(n);
  if (x >= 1_000_000) return (x / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (x >= 1_000) return (x / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(x);
}

/* ===================== Index Page ===================== */
export default function Home({ apps, total, page, pageSize, supabaseOrigin }) {
  // Trạng thái Signed/Revoked lazy fetch cho card đang hiện
  const [certMap, setCertMap] = useState({}); // slug -> 'signed' | 'revoked' | 'error'
  const ioRef = useRef(null);

  // Tạo observer 1 lần
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const controllerMap = new Map();

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const el = entry.target;
        const slug = el.getAttribute('data-app-slug');
        if (!slug) return;
        if (!entry.isIntersecting) return;

        // Đã có rồi thì bỏ qua
        if (certMap[slug] != null) return;

        // Abort cũ (nếu có)
        const prev = controllerMap.get(slug);
        if (prev) prev.abort();

        // Lazy fetch khi card đi vào viewport
        const controller = new AbortController();
        controllerMap.set(slug, controller);

        // Timeout 1500ms để tránh treo
        const to = setTimeout(() => controller.abort(), 1500);

        const run = () => {
          // Nhẹ nhàng hơn: chờ idle nếu rảnh
          const doFetch = () => {
            fetch(`/api/admin/check-slot?slug=${encodeURIComponent(slug)}`, {
              method: 'GET',
              signal: controller.signal,
            })
              .then((r) => r.ok ? r.json() : Promise.reject(new Error('bad status')))
              .then((json) => {
                const status = json?.status; // 'Y' | 'F' | others
                setCertMap((m) => ({
                  ...m,
                  [slug]: status === 'Y' ? 'signed' : status === 'F' ? 'revoked' : 'unknown',
                }));
              })
              .catch(() => {
                setCertMap((m) => ({ ...m, [slug]: 'error' }));
              })
              .finally(() => {
                clearTimeout(to);
                controllerMap.delete(slug);
              });
          };

          if ('requestIdleCallback' in window) {
            window.requestIdleCallback(doFetch, { timeout: 800 });
          } else {
            doFetch();
          }
        };

        run();
      });
    }, { rootMargin: '160px 0px 160px 0px' });

    ioRef.current = io;

    // Observe tất cả badges
    document.querySelectorAll('[data-app-slug]').forEach((el) => io.observe(el));

    return () => {
      io.disconnect();
      controllerMap.forEach((c) => c.abort());
      controllerMap.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]); // khi danh sách đổi mới gắn observer lại

  const pageTitle = useMemo(() => (page > 1 ? `Trang ${page}` : 'Mới nhất'), [page]);

  return (
    <Layout>
      <SEOIndexMeta
        page={page}
        total={total}
        pageSize={pageSize}
        supabaseOrigin={supabaseOrigin}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Ứng dụng iOS {pageTitle}
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tổng {shortNumber(total)} ứng dụng – cập nhật hằng ngày.
          </p>
        </div>

        {/* Grid Apps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {apps.map((app) => {
            const slug = app.slug || app.id;
            const cert = certMap[slug]; // undefined (chưa fetch), 'signed', 'revoked', 'error', 'unknown'
            return (
              <div
                key={slug}
                className="group rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-sm transition-shadow overflow-hidden"
              >
                <Link href={`/${slug}`} className="block p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex-shrink-0">
                      {app.icon_url ? (
                        <Image
                          src={app.icon_url}
                          alt={app.title || 'icon'}
                          width={96}
                          height={96}
                          className="w-12 h-12 object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2" title={app.title}>
                        {app.title}
                      </h3>
                      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 truncate">
                        {app.version ? `v${app.version}` : '--'} · {app.size || '--'}
                      </div>
                    </div>
                  </div>

                  {/* Meta line */}
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span className="truncate">{app.category || 'Ứng dụng'}</span>
                    <span className="whitespace-nowrap">
                      {shortNumber(app.views ?? 0)} lượt xem
                    </span>
                  </div>
                </Link>

                {/* Badge Signed/Revoked – lazy fetch khi card vào viewport */}
                <div className="px-3 sm:px-4 pb-3">
                  <div className="mt-2 h-6">
                    <span
                      data-app-slug={slug}
                      className={classNames(
                        'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] border',
                        cert === 'signed' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                        cert === 'revoked' && 'bg-rose-50 text-rose-700 border-rose-200',
                        cert === 'error' && 'bg-yellow-50 text-yellow-700 border-yellow-200',
                        (cert === undefined || cert === 'unknown') && 'bg-gray-50 text-gray-500 border-gray-200'
                      )}
                      title={
                        cert === 'signed'
                          ? 'Đã ký – cài đặt được'
                          : cert === 'revoked'
                          ? 'Đã bị thu hồi'
                          : cert === 'error'
                          ? 'Không kiểm tra được'
                          : 'Đang kiểm tra…'
                      }
                    >
                      {cert === 'signed' && <b>Signed</b>}
                      {cert === 'revoked' && <b>Revoked</b>}
                      {cert === 'error' && <b>Lỗi</b>}
                      {(cert === undefined || cert === 'unknown') && <span>Đang kiểm tra…</span>}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TODO: Pagination của bạn (giữ nguyên nếu đã có) */}
        {/* <PaginationFull page={page} total={total} pageSize={pageSize} /> */}
      </main>
    </Layout>
  );
}

/* ===================== Data (ISR) ===================== */
export async function getStaticProps() {
  const page = 1;
  const pageSize = 24;
  const from = 0;
  const to = pageSize - 1;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Chỉ lấy field cần cho danh sách để giảm payload
  const selectFields = 'id, slug, title, icon_url, version, size, category, views, downloads, created_at';

  // Gom truy vấn song song (nếu sau này có thêm truy vấn khác, push vào mảng Promise.all)
  const [{ data: apps, count, error }] = await Promise.all([
    supabase
      .from('apps')
      .select(selectFields, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to),
  ]);

  // Derive origin để preconnect/dns-prefetch
  let supabaseOrigin = null;
  try {
    supabaseOrigin = new URL(supabaseUrl).origin;
  } catch {
    supabaseOrigin = null;
  }

  return {
    props: {
      apps: apps || [],
      total: count || 0,
      page,
      pageSize,
      supabaseOrigin,
    },
    // Tự làm mới mỗi 5 phút; khi có build lại, người dùng gần như vào là có HTML sẵn.
    revalidate: 300,
  };
}