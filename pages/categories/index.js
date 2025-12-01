// pages/categories/index.js
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';

export async function getServerSideProps() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name', { ascending: true });

  return {
    props: {
      categories: error || !categories ? [] : categories,
    },
  };
}

export default function CategoriesPage({ categories }) {
  const title = 'Chuyên mục ứng dụng – StoreiOS';
  const description =
    'Danh sách các chuyên mục ứng dụng trên StoreiOS: TestFlight, jailbreak, app clone, app removed và nhiều nhóm ứng dụng khác.';

  const url = 'https://storeios.net/categories';

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={url} />

        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={url} />

        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">📂 Chuyên mục ứng dụng</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Duyệt các ứng dụng theo nhóm: TestFlight, jailbreak, app clone, app removed…
          giúp bạn tìm đúng loại ứng dụng mình cần nhanh hơn.
        </p>

        {(!categories || categories.length === 0) ? (
          <p className="text-gray-500 dark:text-gray-400">
            Hiện chưa có chuyên mục nào được tạo.
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((cat) => {
              const href = cat.slug ? `/category/${cat.slug}` : `/category/${cat.id}`;
              return (
                <Link
                  key={cat.id}
                  href={href}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-800 p-5 bg-white dark:bg-gray-900 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {cat.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Xem tất cả ứng dụng trong chuyên mục {cat.name}.
                    </p>
                  </div>
                  <span className="mt-3 inline-flex items-center text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                    Xem ứng dụng
                    <span className="ml-1">→</span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </Layout>
  );
}