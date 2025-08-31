// pages/[slug].js
'use client';

import Layout from '../components/Layout';
import Comments from '../components/Comments';
import { supabase } from '../lib/supabase';
import { useEffect, useMemo, useState, memo } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { FastAverageColor } from 'fast-average-color';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faChevronDown,
  faChevronUp,
  faCheckCircle,
  faDownload,
  faExclamationTriangle,
  faFileArrowDown,
  faRocket,
  faTimesCircle,
} from '@fortawesome/free-solid-svg-icons';

/* =========================================================
   SSR: Lấy dữ liệu ứng dụng + chuyên mục + ứng dụng liên quan
   ========================================================= */
export async function getServerSideProps(context) {
  const slug = context.params.slug?.toLowerCase();

  // 1) Tìm theo slug (JOIN category)
  let { data: appData, error } = await supabase
    .from('apps')
    .select(`
      *,
      category:categories!apps_category_id_fkey ( id, slug, name )
    `)
    .ilike('slug', slug)
    .single();

  // 2) Nếu không thấy, thử theo ID rồi redirect sang slug chuẩn
  if ((!appData || error) && slug) {
    const fb = await supabase
      .from('apps')
      .select(`
        *,
        category:categories!apps_category_id_fkey ( id, slug, name )
      `)
      .eq('id', slug)
      .single();

    if (fb.data) {
      return {
        redirect: { destination: `/${fb.data.slug}`, permanent: false },
      };
    }
    return { notFound: true };
  }

  // 3) Nếu chưa có category join, fallback lấy riêng
  if (!appData?.category && appData?.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, slug, name')
      .eq('id', appData.category_id)
      .single();
    if (cat) appData = { ...appData, category: cat };
  }

  // 4) Ứng dụng liên quan (cùng category)
  const { data: relatedApps } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version')
    .eq('category_id', appData.category_id)
    .neq('id', appData.id)
    .limit(10);

  return {
    props: {
      serverApp: appData,
      serverRelated: relatedApps ?? [],
    },
  };
}

/* ===================== Helpers chung ===================== */

// Chuỗi "a, b\nc" -> ["a","b","c"]
function parseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return String(input)
    .split(/[,\n]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

// Loại thẻ [tag]...[/tag] hoặc [tag=...]...[/tag], KHÔNG dùng literal regex inline (tránh Vercel inject)
function stripSimpleTagAll(str, tag) {
  let s = String(str);
  const open = `[${tag}`;
  const close = `[/${tag}]`;

  // Xoá thẻ đóng lẻ trước
  while (true) {
    const idx = s.toLowerCase().indexOf(close);
    if (idx === -1) break;
    s = s.slice(0, idx) + s.slice(idx + close.length);
  }

  // Xử lý cặp mở/đóng
  while (true) {
    const lower = s.toLowerCase();
    const iOpen = lower.indexOf(open);
    if (iOpen === -1) break;

    const iBracket = s.indexOf(']', iOpen);
    if (iBracket === -1) {
      s = s.slice(0, iOpen);
      break;
    }

    const iClose = lower.indexOf(close, iBracket + 1);
    if (iClose === -1) {
      // Nếu không có đóng, xoá đoạn [tag...] giữ lại nội dung
      s = s.slice(0, iOpen) + s.slice(iBracket + 1);
      continue;
    }

    const inner = s.slice(iBracket + 1, iClose);
    s = s.slice(0, iOpen) + inner + s.slice(iClose + close.length);
  }
  return s;
}

// Chuyển block [list][*]a[*]b[/list] -> markdown
function processListBlocks(str) {
  let output = '';
  let remaining = String(str);

  while (true) {
    const lower = remaining.toLowerCase();
    const start = lower.indexOf('[list]');
    if (start === -1) {
      output += remaining;
      break;
    }
    const end = lower.indexOf('[/list]', start + 6);
    if (end === -1) {
      output += remaining;
      break;
    }

    const before = remaining.slice(0, start);
    const listContent = remaining.slice(start + 6, end);
    const after = remaining.slice(end + 7);

    const items = listContent
      .split('[*]')
      .map((t) => t.trim())
      .filter(Boolean);

    const md = '\n' + items.map((it) => `- ${it}`).join('\n') + '\n';
    output += before + md;
    remaining = after;
  }
  return output;
}

// Chuyển BBCode cơ bản sang Markdown (an toàn, hạn chế regex literal)
function bbcodeToMarkdownLite(input = '') {
  let s = String(input);

  // Step 1: [b], [i], [u] (có thể lồng nhau)
  s = s.replace(new RegExp('\\[b\\](.*?)\\[/b\\]', 'gi'), '**$1**');
  s = s.replace(new RegExp('\\[i\\](.*?)\\[/i\\]', 'gi'), '*$1*');
  s = s.replace(new RegExp('\\[u\\](.*?)\\[/u\\]', 'gi'), '__$1__');

  // Step 2: [url] & [url=...]
  s = s.replace(new RegExp('\\[url\\](https?:\\/\\/[^\\s\\]]+)\\[/url\\]', 'gi'), '[$1]($1)');
  s = s.replace(
    new RegExp('\\[url=(https?:\\/\\/[^\\]\\s]+)\\](.*?)\\[/url\\]', 'gi'),
    '[$2]($1)'
  );

  // Step 3: [img]
  s = s.replace(new RegExp('\\[img\\](https?:\\/\\/[^\\s\\]]+)\\[/img\\]', 'gi'), '![]($1)');

  // Step 4: [color] và [size] – bỏ thẻ, giữ nội dung
  s = stripSimpleTagAll(s, 'color');
  s = stripSimpleTagAll(s, 'size');

  // Step 5: [list]
  s = processListBlocks(s);

  // Step 6: [quote]
  const quoteR = new RegExp('\\[quote\\]\\s*([\\s\\S]*?)\\s*\\[/quote\\]', 'gi');
  s = s.replace(quoteR, (_m, p1) => {
    return String(p1)
      .trim()
      .split(/\r?\n/)
      .map((line) => `> ${line}`)
      .join('\n');
  });

  // Step 7: [code]
  const codeR = new RegExp('\\[code\\]\\s*([\\s\\S]*?)\\s*\\[/code\\]', 'gi');
  s = s.replace(codeR, (_m, p1) => {
    const body = String(p1).replace(/```/g, '``'); // tránh phá fenced code
    return `\n\`\`\`\n${body}\n\`\`\`\n`;
  });

  return s;
}

function normalizeDescription(raw = '') {
  if (!raw) return '';
  const txt = String(raw);
  // Nếu thấy có BBCode -> convert
  if (/\[(b|i|u|url|img|quote|code|list|\*|size|color)/i.test(txt)) {
    return bbcodeToMarkdownLite(txt);
  }
  // Nếu không, coi như đã là Markdown/Plain
  return txt;
}

function PrettyBlockquote({ children }) {
  return (
    <blockquote className="relative my-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 pl-5 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-transparent">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-blue-500/80 dark:bg-blue-400/80" />
      <div className="text-blue-900 dark:text-blue-100 leading-relaxed">{children}</div>
    </blockquote>
  );
}

/* ===================== InfoRow tái sử dụng ===================== */
const InfoRow = memo(function InfoRow({
  label,
  value,
  expandable = false,
  expanded = false,
  onToggle,
}) {
  return (
    <div className="px-4 py-3 flex items-start">
      <div className="w-40 min-w-[9rem] text-sm text-gray-500">{label}</div>
      <div className="flex-1 text-sm text-gray-800">
        <span className="align-top">{value}</span>
        {expandable && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-2 inline-flex items-center text-blue-600 hover:underline"
          >
            {expanded ? (
              <>
                Thu gọn <FontAwesomeIcon icon={faChevronUp} className="ml-1 h-3" />
              </>
            ) : (
              <>
                Xem thêm <FontAwesomeIcon icon={faChevronDown} className="ml-1 h-3" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
});

/* =========================================================
   Trang chi tiết
   ========================================================= */
export default function Detail({ serverApp, serverRelated }) {
  const router = useRouter();

  const [app, setApp] = useState(serverApp);
  const [related, setRelated] = useState(serverRelated);
  const [dominantColor, setDominantColor] = useState('#f0f2f5');

  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [isInstalling, setIsInstalling] = useState(false);
  const [isFetchingIpa, setIsFetchingIpa] = useState(false);

  const [showAllDevices, setShowAllDevices] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const categorySlug = app?.category?.slug ?? null;
  const isTestflight = categorySlug === 'testflight';
  const isInstallable = ['jailbreak', 'app-clone'].includes(categorySlug);

  // Khi đổi slug route -> reset view state
  useEffect(() => {
    setApp(serverApp);
    setRelated(serverRelated);
    setDominantColor('#f0f2f5');
    setStatus(null);
    setStatusLoading(false);
    setIsInstalling(false);
    setIsFetchingIpa(false);
    setShowAllDevices(false);
    setShowAllLanguages(false);
    setShowFullDescription(false);
  }, [router.query.slug, serverApp, serverRelated]);

  // Tác vụ theo app: đếm view testflight, check slot, lấy màu banner
  useEffect(() => {
    if (!app?.id) return;

    // Đếm view (TestFlight)
    if (isTestflight) {
      fetch('/api/admin/add-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id }),
      }).catch(() => {});
    }

    // Kiểm tra slot TestFlight
    if (isTestflight && app.testflight_url) {
      setStatusLoading(true);
      const id = app.testflight_url.split('/').pop();
      fetch(`/api/admin/check-slot?id=${id}`)
        .then((res) => res.json())
        .then((data) => data.success && setStatus(data.status))
        .catch(() => {})
        .finally(() => setStatusLoading(false));
    }

    // Lấy màu chủ đạo từ icon
    if (app.icon_url && typeof window !== 'undefined') {
      const fac = new FastAverageColor();
      fac
        .getColorAsync(app.icon_url)
        .then((color) => setDominantColor(color.hex))
        .catch(() => {})
        .finally(() => fac.destroy());
    }
  }, [app?.id, app?.icon_url, app?.testflight_url, isTestflight]);

  // Format kích thước hiển thị
  const displaySize = useMemo(() => {
    if (!app?.size) return 'Không rõ';
    const s = String(app.size);
    if (/\bMB\b/i.test(s)) return s;
    const n = Number(s);
    return !isNaN(n) ? `${n} MB` : s;
  }, [app?.size]);

  const languagesArray = useMemo(() => parseList(app?.languages), [app?.languages]);
  const devicesArray = useMemo(() => parseList(app?.supported_devices), [app?.supported_devices]);

  const languagesShort = useMemo(() => {
    const list = languagesArray.slice(0, 6);
    const remain = Math.max(languagesArray.length - 6, 0);
    return { list, remain };
  }, [languagesArray]);

  const devicesShort = useMemo(() => {
    const list = devicesArray.slice(0, 5);
    const remain = Math.max(devicesArray.length - 5, 0);
    return { list, remain };
  }, [devicesArray]);

  // Nút cài đặt (đếm download rồi chuyển trang đếm ngược)
  const handleInstall = async (e) => {
    e.preventDefault();
    if (!app?.id || isTestflight) return;
    setIsInstalling(true);
    try {
      await fetch(`/api/admin/add-download?id=${app.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
    } catch (err) {
      console.error('add-download error', err);
    } finally {
      router.push(`/install/${app.slug}`);
      setIsInstalling(false);
    }
  };

  // Nút tải IPA (qua token + proxy)
  const handleDownloadIpa = async (e) => {
    e.preventDefault();
    if (!app?.id || !isInstallable) return;
    setIsFetchingIpa(true);

    try {
      const tokRes = await fetch('/api/generate-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id, ipa_name: app.download_link }),
      });
      if (!tokRes.ok) throw new Error(`HTTP ${tokRes.status}`);
      const { token } = await tokRes.json();
      if (!token) throw new Error('Thiếu token');

      // Điều hướng tới endpoint tải (giấu link gốc)
      window.location.href = `/api/download-ipa?slug=${encodeURIComponent(
        app.slug
      )}&token=${encodeURIComponent(token)}`;

      // Ghi log tải
      fetch(`/api/admin/add-download?id=${app.id}`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      alert('Không thể tạo link tải IPA. Vui lòng thử lại.');
      console.error('Download IPA error:', err);
    } finally {
      setIsFetchingIpa(false);
    }
  };

  // ======= Auto-scroll & highlight theo ?comment= (đợi element xuất hiện) =======
  useEffect(() => {
    const params =
      typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const id = params?.get('comment');
    if (!id) return;

    let tried = 0;
    const maxTries = 40; // ~2s với 50ms/lần
    const iv = setInterval(() => {
      const el = document.getElementById(`c-${id}`);
      tried++;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50');
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50');
        }, 3000);
        clearInterval(iv);
      } else if (tried >= maxTries) {
        clearInterval(iv);
      }
    }, 50);

    return () => clearInterval(iv);
  }, [router.query?.slug]);
  // ==============================================================================

  if (!app) {
    return (
      <Layout fullWidth>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Không tìm thấy ứng dụng</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded font-bold"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Về trang chủ
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const pageTitle = `${app.name} - App Store`;
  const pageDesc = app.description
    ? app.description.replace(/<\/?[^>]+(>|$)/g, '').slice(0, 160)
    : 'Ứng dụng iOS miễn phí, jailbreak, TestFlight';

  const mdDescription = normalizeDescription(app.description || '');

  return (
    <Layout fullWidth>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDesc} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDesc} />
        <meta property="og:image" content={app.icon_url || ''} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div className="bg-gray-100 min-h-screen pb-12">
        {/* Banner màu theo icon */}
        <div
          className="w-full"
          style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}
        >
          <div className="relative max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 pt-6 pb-8">
            {/* Nút back */}
            <div className="absolute top-3 left-3 z-10">
              <Link
                href="/"
                className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm"
              >
                <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
              </Link>
            </div>

            {/* Icon + tiêu đề */}
            <div className="pt-8 text-center">
              <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl bg-white">
                <img
                  src={app.icon_url || '/placeholder-icon.png'}
                  alt={app.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-icon.png';
                  }}
                />
              </div>
              <h1 className="mt-4 text-2xl font-bold text-gray-900 drop-shadow">{app.name}</h1>
              {app.author && <p className="text-gray-700 text-sm">{app.author}</p>}

              {/* Nút hành động */}
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {isTestflight && app.testflight_url && (
                  <>
                    <a
                      href={app.testflight_url}
                      className="inline-block border border-blue-500 text-blue-700 hover:bg-blue-100 transition px-4 py-2 rounded-full text-sm font-semibold"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faRocket} className="mr-2" />
                      Tham gia TestFlight
                    </a>
                    {statusLoading || status === null ? (
                      <span className="inline-block border border-gray-300 text-gray-500 bg-gray-50 px-4 py-2 rounded-full text-sm font-semibold">
                        Đang kiểm tra...
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
                  </>
                )}

                {!isTestflight && app.download_link && (
                  <>
                    {/* Nút cài đặt qua trang đếm ngược */}
                    <button
                      onClick={handleInstall}
                      disabled={isInstalling}
                      className="inline-flex items-center gap-2 border border-blue-500 text-blue-700 hover:bg-blue-100 disabled:opacity-60 transition px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      <FontAwesomeIcon icon={faDownload} />
                      {isInstalling ? 'Đang chuyển...' : 'Cài đặt ứng dụng'}
                    </button>

                    {/* Nút tải IPA (ẩn link) */}
                    <button
                      onClick={handleDownloadIpa}
                      disabled={isFetchingIpa}
                      className="inline-flex items-center gap-2 border border-gray-400 text-gray-700 hover:bg-gray-100 disabled:opacity-60 transition px-4 py-2 rounded-full text-sm font-semibold"
                    >
                      <FontAwesomeIcon icon={faFileArrowDown} />
                      {isFetchingIpa ? 'Đang tạo link...' : 'Tải IPA'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Nội dung chính */}
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6">
          {/* Thông tin cơ bản */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
              Thông tin ứng dụng
            </div>
            <div className="divide-y divide-gray-100">
              <InfoRow label="Phiên bản" value={app.version || '--'} />
              <InfoRow label="Kích thước" value={displaySize} />
              <InfoRow
                label="Ngôn ngữ"
                value={
                  showAllLanguages || languagesArray.length <= 6 ? (
                    <span>{languagesArray.join(', ') || '--'}</span>
                  ) : (
                    <span>
                      {languagesShort.list.join(', ')}{' '}
                      {languagesShort.remain > 0 && (
                        <span className="text-gray-500">+{languagesShort.remain} nữa</span>
                      )}
                    </span>
                  )
                }
                expandable={languagesArray.length > 6}
                expanded={showAllLanguages}
                onToggle={() => setShowAllLanguages((s) => !s)}
              />
              <InfoRow
                label="Thiết bị hỗ trợ"
                value={
                  showAllDevices || devicesArray.length <= 5 ? (
                    <span>{devicesArray.join(', ') || '--'}</span>
                  ) : (
                    <span>
                      {devicesShort.list.join(', ')}{' '}
                      {devicesShort.remain > 0 && (
                        <span className="text-gray-500">+{devicesShort.remain} nữa</span>
                      )}
                    </span>
                  )
                }
                expandable={devicesArray.length > 5}
                expanded={showAllDevices}
                onToggle={() => setShowAllDevices((s) => !s)}
              />
              <InfoRow label="Giá" value={app.price || 'Miễn phí'} />
              {app.category?.name && <InfoRow label="Chuyên mục" value={app.category.name} />}
              {app.minimum_os_version && (
                <InfoRow label="Yêu cầu iOS" value={app.minimum_os_version} />
              )}
              {app.age_rating && <InfoRow label="Độ tuổi" value={app.age_rating} />}
              {app.release_date && <InfoRow label="Phát hành" value={app.release_date} />}
            </div>
          </div>

          {/* Mô tả (Markdown) */}
          {mdDescription && (
            <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
                Mô tả
              </div>
              <div className="px-4 py-4 prose prose-sm max-w-none prose-blue dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    blockquote: ({ node, ...props }) => <PrettyBlockquote {...props} />,
                  }}
                >
                  {showFullDescription ? mdDescription : mdDescription.slice(0, 2000)}
                </ReactMarkdown>

                {mdDescription.length > 2000 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowFullDescription((s) => !s)}
                      className="inline-flex items-center text-blue-600 hover:underline"
                    >
                      {showFullDescription ? (
                        <>
                          Thu gọn <FontAwesomeIcon icon={faChevronUp} className="ml-1 h-3" />
                        </>
                      ) : (
                        <>
                          Xem đầy đủ <FontAwesomeIcon icon={faChevronDown} className="ml-1 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Ứng dụng cùng chuyên mục */}
          {Array.isArray(related) && related.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
                Ứng dụng cùng chuyên mục
              </div>
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {related.map((r) => (
                  <Link
                    key={r.id}
                    href={`/${r.slug}`}
                    className="group border border-gray-200 rounded-xl p-3 bg-white hover:shadow transition"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-white mx-auto">
                      <img
                        src={r.icon_url || '/placeholder-icon.png'}
                        alt={r.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <div className="text-sm font-semibold text-gray-800 line-clamp-2 group-hover:text-blue-600">
                        {r.name}
                      </div>
                      {r.version && (
                        <div className="text-xs text-gray-500 mt-0.5">v{r.version}</div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bình luận */}
          <div className="mt-6 bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 font-semibold text-gray-800">
              Thảo luận
            </div>
            <div className="p-4">
              {/* Truyền postTitle để thông báo giàu nội dung */}
              <Comments postId={app.slug} postTitle={app.name} />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
