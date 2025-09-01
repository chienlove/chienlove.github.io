// pages/[slug].js
'use client';

import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, memo } from 'react';
import { FastAverageColor } from 'fast-average-color';
import { auth } from '../lib/firebase-client';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faRocket,
  faArrowLeft,
  faCodeBranch,
  faDatabase,
  faUser,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faChevronDown,
  faChevronUp,
  faFileArrowDown,
  faHouse,
  faAngleRight,
} from '@fortawesome/free-solid-svg-icons';

// ✅ Dynamic import còn lại
const Comments = dynamic(() => import('../components/Comments'), {
  ssr: false,
  loading: () => <div className="text-sm text-gray-500">Đang tải bình luận…</div>,
});

/* ===================== SSR ===================== */
export async function getServerSideProps(context) {
  const slug = context.params.slug?.toLowerCase();

  // 1) App + JOIN category
  let { data: appData, error } = await supabase
    .from('apps')
    .select(`
      *,
      category:categories!apps_category_id_fkey ( id, slug, name )
    `)
    .ilike('slug', slug)
    .single();

  // 2) Fallback bằng ID
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
      return { redirect: { destination: `/${fb.data.slug}`, permanent: false } };
    }
    return { notFound: true };
  }

  // 3) Fallback JOIN category nếu chưa có
  if (!appData?.category && appData?.category_id) {
    const { data: cat } = await supabase
      .from('categories')
      .select('id, slug, name')
      .eq('id', appData.category_id)
      .single();
    if (cat) appData = { ...appData, category: cat };
  }

  // 4) Related apps
  const { data: relatedApps } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version, category_id')
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

/* ===================== Helpers ===================== */

// Tách danh sách từ chuỗi: "iOS 14, iPadOS" → ["iOS 14", "iPadOS"]
function parseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return String(input)
    .split(/[,\n]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

// Xoá thẻ [tag=...] hoặc [tag]...[/tag] – không dùng regex
function stripSimpleTagAll(str, tag) {
  let s = String(str);
  const open = `[${tag}`;
  const close = `[/${tag}]`;

  // Xoá thẻ đóng lẻ
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
      s = s.slice(0, iOpen) + s.slice(iBracket + 1);
      continue;
    }

    const inner = s.slice(iBracket + 1, iClose);
    s = s.slice(0, iOpen) + inner + s.slice(iClose + close.length);
  }
  return s;
}

// Chuyển [list][*]...[/list] → Markdown
function processListBlocks(str) {
  let output = '';
  let remaining = String(str);

  while (true) {
    const lower = remaining.toLowerCase();
    const start = lower.indexOf('[list]');
    if (start === -1) { output += remaining; break; }

    const end = lower.indexOf('[/list]', start + 6);
    if (end === -1) { output += remaining; break; }

    const before = remaining.slice(0, start);
    const listContent = remaining.slice(start + 6, end);
    const after = remaining.slice(end + 7);

    const items = listContent
      .split('[*]')
      .map(t => t.trim())
      .filter(Boolean);

    const md = '\n' + items.map(it => `- ${it}`).join('\n') + '\n';
    output += before + md;
    remaining = after;
  }
  return output;
}

// BBCode → Markdown (an toàn, ít regex)
function bbcodeToMarkdownLite(input = '') {
  let s = String(input);

  // Step 1: [b], [i], [u]
  s = s.replace(/\[b\](.*?)\[\/b\]/gi, '**$1**');
  s = s.replace(/\[i\](.*?)\[\/i\]/gi, '*$1*');
  s = s.replace(/\[u\](.*?)\[\/u\]/gi, '__$1__');

  // Step 2: [url] & [url=...]
  s = s.replace(/\[url\](https?:\/\/[^\s\]]+)\[\/url\]/gi, '[$1]($1)');
  s = s.replace(/\[url=(https?:\/\/[^\]\s]+)\](.*?)\[\/url\]/gi, '[$2]($1)');

  // Step 3: [img]
  s = s.replace(/\[img\](https?:\/\/[^\s\]]+)\[\/img\]/gi, '![]($1)');

  // Step 4: [color] và [size] – bỏ qua
  s = stripSimpleTagAll(s, 'color');
  s = stripSimpleTagAll(s, 'size');

  // Step 5: [list]
  s = processListBlocks(s);

  // Step 6: [quote]
  const quoteR = new RegExp('\\[quote\\]\\s*([\\s\\S]*?)\\s*\\[/quote\\]', 'gi');
  s = s.replace(quoteR, (_m, p1) => {
    return String(p1).trim().split(/\r?\n/).map(line => `> ${line}`).join('\n');
  });

  // Step 7: [code]
  const codeR = new RegExp('\\[code\\]\\s*([\\s\\S]*?)\\s*\\[/code\\]', 'gi');
  s = s.replace(codeR, (_m, p1) => {
    const body = String(p1).replace(/```/g, '``');
    return `\n\`\`\`\n${body}\n\`\`\`\n`;
  });

  return s;
}

function normalizeDescription(raw = '') {
  if (!raw) return '';
  const txt = String(raw);
  if (/\[(b|i|u|url|img|quote|code|list|\*|size|color)/i.test(txt)) {
    return bbcodeToMarkdownLite(txt);
  }
  return txt;
}

function PrettyBlockquote({ children }) {
  return (
    <blockquote className="relative my-4 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-4 pl-5 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-transparent">
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl bg-blue-500/80 dark:bg-blue-400/80" />
      <div className="text-blue-900 dark:text-blue-100 leading-relaxed">
        {children}
      </div>
    </blockquote>
  );
}

// ===================== InfoRow (tối ưu) =====================
const InfoRow = memo(({ label, value, expandable = false, expanded = false, onToggle }) => {
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
InfoRow.displayName = 'InfoRow';

/* ===================== Center Modal (dùng cho gate) ===================== */
function CenterModal({ open, title, body, actions }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative w-[92vw] max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl p-4">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <div className="text-sm text-gray-800">{body}</div>
        <div className="mt-4 flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

/* ===================== Page ===================== */
export default function Detail({ serverApp, serverRelated }) {
  const router = useRouter();
  const [app, setApp] = useState(serverApp);
  const [related, setRelated] = useState(serverRelated);
  const [dominantColor, setDominantColor] = useState('#f0f2f5');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isFetchingIpa, setIsFetchingIpa] = useState(false);
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // ✅ Đợi cả ReactMarkdown và remarkGfm
  const [remarkGfm, setRemarkGfm] = useState(null);
  const [ReactMarkdown, setReactMarkdown] = useState(null);

  useEffect(() => {
    Promise.all([
      import('react-markdown').then(m => m.default),
      import('remark-gfm').then(m => m.default),
    ]).then(([md, gfm]) => {
      setReactMarkdown(() => md);
      setRemarkGfm(() => gfm);
    });
  }, []);

  // Auth state để gate tải IPA
  const [me, setMe] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', body: null, actions: null });

  const categorySlug = app?.category?.slug ?? null;
  const isTestflight = categorySlug === 'testflight';
  const isInstallable = ['jailbreak', 'app-clone'].includes(categorySlug);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => setMe(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    setApp(serverApp);
    setRelated(serverRelated);
    setShowFullDescription(false);
    setDominantColor('#f0f2f5');
    setShowAllDevices(false);
    setShowAllLanguages(false);
  }, [router.query.slug, serverApp, serverRelated]);

  useEffect(() => {
    if (!app?.id) return;

    // Đếm view TestFlight
    if (isTestflight) {
      fetch('/api/admin/add-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id }),
      }).catch(console.error);
    }

    // Kiểm tra slot TestFlight
    if (isTestflight && app.testflight_url) {
      setStatusLoading(true);
      const id = app.testflight_url.split('/').pop();
      fetch(`/api/admin/check-slot?id=${id}`)
        .then(res => res.json())
        .then(data => data.success && setStatus(data.status))
        .catch(console.error)
        .finally(() => setStatusLoading(false));
    }

    // Màu nền từ icon
    if (app.icon_url && typeof window !== 'undefined') {
      const fac = new FastAverageColor();
      fac.getColorAsync(app.icon_url)
        .then(color => setDominantColor(color.hex))
        .catch(console.error)
        .finally(() => fac.destroy());
    }
  }, [app?.id, app?.icon_url, app?.testflight_url, isTestflight]);

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
      console.error('Lỗi tăng lượt tải:', err);
    } finally {
      router.push(`/install/${app.slug}`);
      setIsInstalling(false);
    }
  };

  const requireVerified = () => {
    setModal({
      open: true,
      title: 'Cần xác minh email',
      body: (
        <div className="text-sm">
          <p>Bạn cần <b>đăng nhập</b> và <b>xác minh email</b> để tải IPA.</p>
          <p className="mt-1 text-xs text-gray-500">Không thấy email xác minh? Hãy kiểm tra thư rác hoặc gửi lại từ trang <Link href="/profile" className="text-blue-600 underline">Hồ sơ</Link>.</p>
        </div>
      ),
      actions: (
        <>
          <Link href="/login" className="px-3 py-2 text-sm rounded bg-gray-900 text-white">Đăng nhập</Link>
          <button onClick={() => setModal(s => ({ ...s, open: false }))} className="px-3 py-2 text-sm rounded border">Đóng</button>
        </>
      ),
    });
  };

  const handleDownloadIpa = async (e) => {
    e.preventDefault();
    if (!app?.id || !isInstallable) return;

    if (!me || !me.emailVerified) {
      requireVerified();
      return;
    }

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

      window.location.href = `/api/download-ipa?slug=${encodeURIComponent(app.slug)}&token=${encodeURIComponent(token)}`;
      fetch(`/api/admin/add-download?id=${app.id}`, { method: 'POST' }).catch(() => {});
    } catch (err) {
      alert('Không thể tạo link tải IPA. Vui lòng thử lại.');
      console.error('Download IPA error:', err);
    } finally {
      setIsFetchingIpa(false);
    }
  };

  useEffect(() => {
    const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('comment') : null;
    if (!id) return;
    const el = document.getElementById(`c-${id}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-2', 'ring-amber-400', 'bg-amber-50');
    const t = setTimeout(() => {
      el.classList.remove('ring-2', 'ring-amber-400', 'bg-amber-50');
    }, 3000);
    return () => clearTimeout(t);
  }, [router.query?.slug]);

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

  const title = `${app.name} - App Store`;
  const description = app.description
    ? app.description.replace(/<\/?[^>]+(>|$)/g, '').slice(0, 160)
    : 'Ứng dụng iOS miễn phí, jailbreak, TestFlight';

  return (
    <Layout fullWidth>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={app.icon_url} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <CenterModal open={modal.open} title={modal.title} body={modal.body} actions={modal.actions} />

      <div className="bg-gray-100 min-h-screen pb-12">
        <div className="w-full flex justify-center mt-10 bg-gray-100">
          <div className="relative w-full max-w-screen-2xl px-2 sm:px-4 md:px-6 pb-8 bg-white rounded-none">
            <div
              className="w-full pb-6"
              style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}
            >
              <div className="absolute top-3 left-3 z-10">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm"
                  aria-label="Back"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                </Link>
              </div>

              <nav aria-label="Breadcrumb" className="pt-3 px-4">
                <ol className="mx-auto max-w-screen-2xl flex items-center gap-1 text-sm text-blue-900/90">
                  <li>
                    <Link href="/" className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 hover:bg-white text-blue-700 font-medium shadow-sm">
                      <FontAwesomeIcon icon={faHouse} className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Trang chủ</span>
                    </Link>
                  </li>
                  <li className="text-blue-700/50">
                    <FontAwesomeIcon icon={faAngleRight} />
                  </li>
                  <li>
                    {app?.category?.slug ? (
                      <Link
                        href={`/category/${app.category.slug}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 hover:bg-white text-blue-700 font-medium shadow-sm"
                      >
                        <span className="truncate max-w-[40vw] sm:max-w-none">{app.category.name || 'Chuyên mục'}</span>
                      </Link>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white text-blue-700/70 font-medium shadow-sm">
                        Chuyên mục
                      </span>
                    )}
                  </li>
                  <li className="text-blue-700/50">
                    <FontAwesomeIcon icon={faAngleRight} />
                  </li>
                  <li>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-600 text-white font-semibold shadow">
                      {app.name}
                    </span>
                  </li>
                </ol>
              </nav>

              <div className="pt-6 text-center px-4">
                <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl">
                  <img
                    src={app.icon_url || '/placeholder-icon.png'}
                    alt={app.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/placeholder-icon.png'; }}
                  />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-gray-900 drop-shadow">{app.name}</h1>
                {app.author && <p className="text-gray-700 text-sm">{app.author}</p>}

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
                          Đang kiểm tra…
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

                  {isInstallable && (
                    <>
                      <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className={`inline-flex items-center border border-green-500 text-green-700 transition px-4 py-2 rounded-full text-sm font-semibold active:scale-95 active:bg-green-200 active:shadow-inner active:ring-2 active:ring-green-500 ${isInstalling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100'}`}
                      >
                        {isInstalling ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang xử lý…
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faDownload} className="mr-2" />
                            Cài đặt
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadIpa}
                        disabled={isFetchingIpa}
                        className={`inline-flex items-center border border-blue-500 text-blue-700 transition px-4 py-2 rounded-full text-sm font-semibold active:scale-95 active:bg-blue-200 active:shadow-inner active:ring-2 active:ring-blue-500 ${isFetchingIpa ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100'}`}
                        title="Tải file IPA (ẩn nguồn tải)"
                      >
                        {isFetchingIpa ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Đang tạo…
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faFileArrowDown} className="mr-2" />
                            Tải IPA
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6 space-y-6">
          {/* Info cards */}
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
              <p className="text-sm text-gray-800">{displaySize}</p>
            </div>
            <div className="px-0.5 sm:px-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                {isTestflight ? 'LƯỢT XEM' : 'Lượt tải'}
              </p>
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

          {/* Mô tả */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Mô tả</h2>
            <div className={`relative overflow-hidden transition-all duration-300 ${showFullDescription ? '' : 'max-h-72'}`}>
              <div className={`${showFullDescription ? '' : 'mask-gradient-bottom'}`}>
                {ReactMarkdown && remarkGfm && (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: (props) => <h3 className="text-xl font-bold mt-3 mb-2" {...props} />,
                      h2: (props) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
                      h3: (props) => <h5 className="text-base font-bold mt-3 mb-2" {...props} />,
                      p: (props) => <p className="text-gray-700 leading-7 mb-3" {...props} />,
                      ul: (props) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
                      ol: (props) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
                      li: (props) => <li className="marker:text-blue-500" {...props} />,
                      a: (props) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                      code: ({ inline, ...props }) =>
                        inline ? (
                          <code className="px-1 py-0.5 rounded bg-gray-100 text-pink-700" {...props} />
                        ) : (
                          <pre className="p-3 rounded bg-gray-900 text-gray-100 overflow-auto mb-3"><code {...props} /></pre>
                        ),
                      blockquote: (props) => <PrettyBlockquote {...props} />,
                      hr: () => <hr className="my-4 border-gray-200" />,
                    }}
                  >
                    {normalizeDescription(app.description)}
                  </ReactMarkdown>
                )}
              </div>
              {!showFullDescription && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white to-transparent" />
              )}
            </div>
            {app?.description && app.description.length > 300 && (
              <button
                onClick={() => setShowFullDescription(v => !v)}
                className="mt-3 text-sm text-blue-600 hover:underline font-bold"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {/* Screenshots */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                {app.screenshots.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-full h-auto object-cover"
                      onError={(e) => { e.target.src = '/placeholder-image.png'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thông tin chi tiết */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <h2 className="px-4 pt-4 text-lg font-bold text-gray-800">Thông tin</h2>
            <div className="mt-3 divide-y divide-gray-200">
              <InfoRow label="Nhà phát triển" value={app.author || 'Không rõ'} />
              <InfoRow label="Phiên bản" value={app.version || 'Không rõ'} />
              <InfoRow label="Dung lượng" value={displaySize} />
              <InfoRow
                label="Thiết bị hỗ trợ"
                value={
                  devicesArray.length
                    ? showAllDevices
                      ? devicesArray.join(', ')
                      : `${devicesShort.list.join(', ')}${devicesShort.remain ? `, +${devicesShort.remain}` : ''}`
                    : 'Không rõ'
                }
                expandable={devicesArray.length > devicesShort.list.length}
                expanded={showAllDevices}
                onToggle={() => setShowAllDevices(v => !v)}
              />
              <InfoRow
                label="Ngôn ngữ"
                value={
                  languagesArray.length
                    ? showAllLanguages
                      ? languagesArray.join(', ')
                      : `${languagesShort.list.join(', ')}${languagesShort.remain ? `, +${languagesShort.remain}` : ''}`
                    : 'Không rõ'
                }
                expandable={languagesArray.length > languagesShort.list.length}
                expanded={showAllLanguages}
                onToggle={() => setShowAllLanguages(v => !v)}
              />
              <InfoRow label="Yêu cầu iOS" value={app.minimum_os_version ? `iOS ${app.minimum_os_version}+` : 'Không rõ'} />
              <InfoRow
                label="Ngày phát hành"
                value={
                  app.release_date
                    ? new Date(app.release_date).toLocaleDateString('vi-VN')
                    : 'Không rõ'
                }
              />
              <InfoRow label="Xếp hạng tuổi" value={app.age_rating || 'Không rõ'} />
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>
              <div className="divide-y divide-gray-200">
                {related.map((item) => (
                  <Link
                    href={`/${item.slug}`}
                    key={item.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={item.icon_url || '/placeholder-icon.png'}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shadow-sm"
                        onError={(e) => { e.target.src = '/placeholder-icon.png'; }}
                      />
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {item.author && <span>{item.author}</span>}
                          {item.version && (
                            <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium">
                              {item.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faDownload} className="text-blue-500 text-lg" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Bình luận */}
          <div className="bg-white rounded-xl p-4 shadow">
            <Comments postId={app.slug} postTitle={app.name} />
          </div>
        </div>
      </div>
    </Layout>
  );
}
