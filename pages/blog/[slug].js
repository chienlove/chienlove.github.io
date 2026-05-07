// pages/blog/[slug].js
import Head from "next/head";
import { useMemo } from "react";
import { useRouter } from "next/router";
import Layout from "../../components/Layout";
import { supabase } from "../../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faClock,
  faUser,
} from "@fortawesome/free-solid-svg-icons";

export async function getServerSideProps(context) {
  const { slug } = context.params || {};

  if (!slug) {
    return { notFound: true };
  }

  // Lấy bài viết theo slug
  const { data: post, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !post) {
    return { notFound: true };
  }

  // Có thể lấy thêm bài mới để làm "Bài viết mới nhất" (tuỳ chọn)
  const { data: latestPosts } = await supabase
    .from("blog_posts")
    .select("id,title,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    props: {
      post,
      latestPosts: latestPosts || [],
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
  return Math.max(1, Math.round(words / 200));
}

// Markdown đơn giản: tạo <p>, <br>, bold, heading
function useSimpleMarkdown(content) {
  return useMemo(() => {
    if (!content) return "";

    // Escape basic HTML
    let text = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Heading: #, ##, ###
    text = text.replace(
      /^### (.*)$/gm,
      '<h3 class="text-lg font-semibold mt-6 mb-2 text-gray-900 dark:text-gray-50">$1</h3>'
    );
    text = text.replace(
      /^## (.*)$/gm,
      '<h2 class="text-xl font-bold mt-6 mb-2 text-gray-900 dark:text-gray-50">$1</h2>'
    );
    text = text.replace(
      /^# (.*)$/gm,
      '<h1 class="text-2xl font-extrabold mt-6 mb-3 text-gray-900 dark:text-gray-50">$1</h1>'
    );

    // Bold **text**
    text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Link [text](url)
    text = text.replace(
      /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
      '<a href="$2" class="text-blue-600 dark:text-blue-400 underline" target="_blank" rel="noopener noreferrer">$1</a>'
    );

    // Ảnh ![alt](url)
    text = text.replace(
      /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g,
      '<figure class="my-4"><img src="$2" alt="$1" class="rounded-xl shadow-sm mx-auto max-h-[420px] w-auto" loading="lazy"/><figcaption class="mt-1 text-xs text-center text-gray-500 dark:text-gray-400">$1</figcaption></figure>'
    );

    // Đoạn & xuống dòng
    const paragraphs = text
      .split(/\n{2,}/)
      .map((block) =>
        block
          .split("\n")
          .join("<br />")
          .trim()
      )
      .filter(Boolean);

    return paragraphs
      .map(
        (html) =>
          `<p class="mb-4 leading-relaxed text-gray-800 dark:text-gray-200">${html}</p>`
      )
      .join("\n");
  }, [content]);
}

export default function BlogPostPage({ post, latestPosts }) {
  const router = useRouter();

  const readingTime = calcReadingTime(post.content);
  const contentHtml = useSimpleMarkdown(post.content);

  const baseUrl = "https://storeios.net";
  const url = `${baseUrl}/blog/${post.slug}`;

  const title =
    (post.seo_title && post.seo_title.length > 0
      ? post.seo_title
      : `${post.title} – Blog StoreiOS`) || "Blog StoreiOS";
  const description =
    post.excerpt ||
    "Bài viết hướng dẫn chi tiết trên Blog StoreiOS về TestFlight, ký IPA, TrollStore và các thủ thuật iOS an toàn, không chia sẻ hack, crack, cheat hay phần mềm độc hại.";
  const ogImage = post.cover_image_url || `${baseUrl}/og-image-blog.png`;

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />
        <meta property="og:image" content={ogImage} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <main className="max-w-5xl mx-auto px-4 py-8 lg:py-10">
        {/* Back button */}
        <div className="mb-4">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2 h-4 w-4" />
            Quay lại
          </button>
        </div>

        <article className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          {/* Main content */}
          <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            {/* Cover */}
            {post.cover_image_url && (
              <div className="w-full h-48 sm:h-64 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.cover_image_url}
                  alt={post.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}

            <div className="px-5 sm:px-6 py-6 sm:py-7">
              {/* Title & meta */}
              <header className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
                  {post.title}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
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

              {/* Content */}
              <section
                className="prose prose-sm sm:prose-base dark:prose-invert max-w-none prose-img:rounded-xl prose-a:text-blue-600 dark:prose-a:text-blue-400"
                dangerouslySetInnerHTML={{ __html: contentHtml }}
              />
            </div>
          </section>

          {/* Sidebar – latest posts */}
          <aside className="space-y-4">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-50 mb-3">
                Bài viết mới
              </h2>
              <ul className="space-y-2">
                {latestPosts
                  .filter((p) => p.id !== post.id)
                  .slice(0, 5)
                  .map((p) => (
                    <li key={p.id}>
                      <a
                        href={`/blog/${p.slug}`}
                        className="block text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {p.title}
                      </a>
                      {p.created_at && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          {formatDate(p.created_at)}
                        </p>
                      )}
                    </li>
                  ))}
                {(!latestPosts || latestPosts.length <= 1) && (
                  <li className="text-xs text-gray-500 dark:text-gray-500">
                    Chưa có thêm bài viết khác.
                  </li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-4 sm:p-5 text-xs text-gray-600 dark:text-gray-400">
              StoreiOS chỉ cung cấp thông tin hướng dẫn và liên kết cài đặt ứng
              dụng đã được ký hợp pháp. Chúng tôi không chia sẻ và không khuyến
              khích sử dụng các hình thức hack, crack, cheat, mod hay bất kỳ
              phần mềm độc hại nào.
            </div>
          </aside>
        </article>
      </main>
    </Layout>
  );
}