// pages/blog/index.js
import Head from "next/head";
import Link from "next/link";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faArrowRight,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export async function getServerSideProps() {
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });

  return {
    props: {
      posts: error || !data ? [] : data,
    },
  };
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function calcReadingTime(text) {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length || 1;
  return Math.max(1, Math.round(words / 200)); // ~200 từ / phút
}

export default function BlogIndexPage({ posts }) {
  const title = "Blog StoreiOS – Hướng dẫn TestFlight, ký IPA, TrollStore";
  const description =
    "Blog StoreiOS chia sẻ hướng dẫn chi tiết về TestFlight, ký IPA, TrollStore, và các mẹo sử dụng ứng dụng iOS an toàn. Nội dung hợp pháp, không chia sẻ hack, crack, cheat hay phần mềm độc hại.";
  const url = "https://storeios.net/blog";

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

      <main className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            Blog StoreiOS
          </h1>
          <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
            Tổng hợp các bài viết hướng dẫn cài ứng dụng TestFlight, ký IPA,
            TrollStore và những mẹo sử dụng iPhone an toàn. StoreiOS chỉ cung
            cấp liên kết cài ứng dụng đã ký hợp pháp, không chia sẻ hack, crack,
            cheat, mod hay phần mềm độc hại.
          </p>
        </section>

        {/* Empty state */}
        {(!posts || posts.length === 0) && (
          <div className="mt-10 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-6 py-10 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Chưa có bài viết nào được đăng. Hãy thêm bài mới trong trang
              admin.
            </p>
          </div>
        )}

        {/* List */}
        {posts && posts.length > 0 && (
          <section className="space-y-4">
            {posts.map((post) => {
              const href = `/blog/${post.slug}`;
              const readingTime = calcReadingTime(post.content);
              return (
                <article
                  key={post.id}
                  className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:border-blue-400/60 dark:hover:border-blue-400/70 transition-all overflow-hidden"
                >
                  <Link href={href} className="flex flex-col sm:flex-row">
                    {/* Cover */}
                    {post.cover_image_url && (
                      <div className="sm:w-40 md:w-48 h-40 sm:h-auto flex-shrink-0 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.cover_image_url}
                          alt={post.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 p-5 sm:p-6">
                      <header>
                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                          {post.title}
                        </h2>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                          {post.author_name && (
                            <span className="inline-flex items-center gap-1">
                              <FontAwesomeIcon icon={faUser} className="h-3 w-3" />
                              {post.author_name}
                            </span>
                          )}
                          {post.created_at && (
                            <span>{formatDate(post.created_at)}</span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <FontAwesomeIcon
                              icon={faClock}
                              className="h-3 w-3 text-gray-400"
                            />
                            {readingTime} phút đọc
                          </span>
                        </div>
                      </header>

                      {post.excerpt && (
                        <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}

                      <footer className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>
                          Chuyên mục:{" "}
                          <span className="font-semibold">Hướng dẫn iOS</span>
                        </span>
                        <span className="inline-flex items-center font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform">
                          Đọc tiếp
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="ml-1 h-3 w-3"
                          />
                        </span>
                      </footer>
                    </div>
                  </Link>
                </article>
              );
            })}
          </section>
        )}
      </main>
    </Layout>
  );
}