// pages/blog/index.js
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';

export async function getServerSideProps() {
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('*')
    .order('created_at', { ascending: false });

  return { props: { posts: posts || [] } };
}

export default function BlogIndex({ posts }) {
  const title = 'Blog – Hướng dẫn iOS, TestFlight & Ký IPA | StoreiOS';
  const description =
    'Tổng hợp bài viết hướng dẫn sử dụng iOS, cài đặt ứng dụng TestFlight, ký IPA, TrollStore, eSign, jailbreak và các mẹo tối ưu hệ thống.';

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-4">📚 Blog – Hướng dẫn & Tin tức iOS</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Các bài viết chuyên sâu về iOS, TestFlight, ký IPA, TrollStore, jailbreak
          và bảo mật thiết bị. Nội dung hoàn toàn hợp pháp và an toàn.
        </p>

        {posts.length === 0 && (
          <div className="text-gray-500 text-center py-20">
            Chưa có bài viết nào – bạn hãy thêm bài mới từ trang Admin.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {posts.map((p) => (
            <Link
              href={`/blog/${p.slug}`}
              key={p.id}
              className="block bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 hover:shadow-xl transition-all"
            >
              <h2 className="text-xl font-bold mb-2">{p.title}</h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3">
                {p.excerpt}
              </p>

              <p className="mt-4 text-xs text-gray-500">
                {new Date(p.created_at).toLocaleDateString('vi-VN')}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  );
}