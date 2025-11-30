// pages/category/[slug].js
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faDownload,
  faEye,
} from '@fortawesome/free-solid-svg-icons';

export async function getServerSideProps(context) {
  const { slug } = context.params;

  // Lấy thông tin category theo slug
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (categoryError || !category) {
    return { notFound: true };
  }

  // Lấy apps thuộc category
  const { data: apps, error: appsError } = await supabase
    .from('apps')
    .select('*')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  return {
    props: {
      category,
      apps: apps || [],
    },
  };
}

export default function CategoryPage({ category, apps }) {
  const router = useRouter();

  if (!category) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Không tìm thấy chuyên mục</h1>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Về trang chủ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isTestFlightCategory =
    category.slug?.toLowerCase().includes('testflight') ||
    category.slug?.toLowerCase().includes('test-flight');

  // Tổng lượt cài / lượt xem
  const totalInstalls = apps.reduce(
    (sum, app) => sum + (app.installs ?? app.downloads ?? 0),
    0
  );
  const totalViews = apps.reduce(
    (sum, app) => sum + (app.views ?? 0),
    0
  );

  const formattedTotal = (value) =>
    (value || 0).toLocaleString('vi-VN');

  const appCount = apps.length;

  // SEO meta
  const baseUrl = 'https://storeios.net';
  const categoryPath = category.slug
    ? `/category/${category.slug}`
    : `/category/${category.id}`;
  const url = `${baseUrl}${categoryPath}`;

  const title = `${category.name} – Ứng dụng iOS trên StoreiOS`;
  const description =
    category.seo_description ||
    `Danh sách các ứng dụng trong chuyên mục ${category.name} trên StoreiOS. ${
      isTestFlightCategory
        ? 'Theo dõi số lượt xem cho từng ứng dụng TestFlight.'
        : 'Xem nhanh số lượt cài đặt cho từng ứng dụng.'
    }`;

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <div className="w-full max-w-6xl mx-auto px-4 py-8">
        {/* Breadcrumb + back */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
            Quay lại
          </button>
        </div>

        {/* Header section */}
        <section className="mb-8 rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 px-5 sm:px-7 py-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-50">
                {category.name}
              </h1>
              {category.description && (
                <p className="mt-2 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
                  {category.description}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col min-w-[110px]">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold">
                  Số ứng dụng
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {appCount}
                </span>
              </div>

              <div className="px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex flex-col min-w-[150px]">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1">
                  {isTestFlightCategory ? (
                    <>
                      <FontAwesomeIcon icon={faEye} className="w-3 h-3" />
                      Tổng lượt xem
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                      Tổng lượt cài đặt
                    </>
                  )}
                </span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formattedTotal(
                    isTestFlightCategory ? totalViews : totalInstalls
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* App list */}
        {apps.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
            <p className="text-gray-600 dark:text-gray-400">
              Chưa có ứng dụng nào trong chuyên mục này.
            </p>
          </div>
        ) : (
          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {apps.map((app) => {
                const installs = app.installs ?? app.downloads ?? 0;
                const views = app.views ?? 0;
                const metricValue = isTestFlightCategory ? views : installs;

                return (
                  <Link
                    key={app.id}
                    href={`/${app.slug}`}
                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:border-blue-400/60 dark:hover:border-blue-400/70 transition-all overflow-hidden flex flex-col"
                  >
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 shadow-sm">
                          <img
                            src={app.icon_url || '/placeholder-icon.png'}
                            alt={app.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                            {app.name}
                          </h2>
                          {app.author && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                              {app.author}
                            </p>
                          )}
                        </div>
                      </div>

                      {app.short_description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-4">
                          {app.short_description}
                        </p>
                      )}

                      <div className="mt-auto pt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">
                          v{app.version || '--'}
                        </span>
                        <span className="flex items-center gap-1 font-semibold">
                          <FontAwesomeIcon
                            icon={isTestFlightCategory ? faEye : faDownload}
                            className="w-3 h-3"
                          />
                          {metricValue ? metricValue.toLocaleString('vi-VN') : '0'}
                          <span className="normal-case text-[10px] ml-1">
                            {isTestFlightCategory ? 'lượt xem' : 'lượt cài'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </Layout>
  );
}