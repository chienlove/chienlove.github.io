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
import { sendEmailVerification } from 'firebase/auth';
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
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

// Lazy-load Comments
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

  // 3) Bổ sung category nếu thiếu
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
    .order('created_at', { ascending: false })
    .limit(50);

  return {
    props: {
      serverApp: appData,
      serverRelated: relatedApps ?? [],
    },
  };
}

/* ===================== Helpers ===================== */

function parseList(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  return String(input)
    .split(/[,\n]+/)
    .map(x => x.trim())
    .filter(Boolean);
}

function stripSimpleTagAll(str, tag) {
  let s = String(str);
  const open = `[${tag}`;
  const close = `[/${tag}]`;

  while (true) {
    const idx = s.toLowerCase().indexOf(close);
    if (idx === -1) break;
    s = s.slice(0, idx) + s.slice(idx + close.length);
  }
  while (true) {
    const lower = s.toLowerCase();
    const iOpen = lower.indexOf(open);
    if (iOpen === -1) break;
    const iBracket = s.indexOf(']', iOpen);
    if (iBracket === -1) { s = s.slice(0, iOpen); break; }
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

/* ====== BBCode → Markdown (an toàn, tránh regex literal) ====== */
function bbcodeToMarkdownLite(input = '') {
  let s = String(input);
  const R = (p, f) => { s = s.replace(new RegExp(p, 'gi'), f); };

  // [b][i][u]
  R('\\[b\\]([\\s\\S]*?)\\[/b\\]', (_m, g1) => `**${g1}**`);
  R('\\[i\\]([\\s\\S]*?)\\[/i\\]', (_m, g1) => `*${g1}*`);
  R('\\[u\\]([\\s\\S]*?)\\[/u\\]', (_m, g1) => `__${g1}__`);

  // [url]...[/url] & [url=...]text[/url]
  R('\\[url\\](https?:\\/\\/[^\\s\\]]+)\\[/url\\]', (_m, g1) => `[${g1}](${g1})`);
  R('\\[url=([^\\]]+)\\]([\\s\\S]*?)\\[/url\\]', (_m, g1, g2) => `[${g2}](${g1})`);

  // [img]...[/img]
  R('\\[img\\](https?:\\/\\/[^\\s\\]]+)\\[/img\\]', (_m, g1) => `![](${g1})`);

  // Loại [color], [size]
  s = stripSimpleTagAll(s, 'color');
  s = stripSimpleTagAll(s, 'size');

  // [list][*]...[/list] (split-based)
  s = processListBlocks(s);

  // [quote]...[/quote]
  s = s.replace(new RegExp('\\[quote\\]\\s*([\\s\\S]*?)\\s*\\[/quote\\]', 'gi'), (_m, g1) => {
    return String(g1).trim().split(/\r?\n/).map(line => `> ${line}`).join('\n');
  });

  // [code]...[/code]
  s = s.replace(new RegExp('\\[code\\]\\s*([\\s\\S]*?)\\s*\\[/code\\]', 'gi'), (_m, g1) => {
    const body = String(g1).replace(/```/g, '``');
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

/* ===================== BREADCRUMB MỚI (tối giản, hiện đại, 1 dòng, không scroll ngang) =====================

   - Không dùng SVG hình phức tạp => tránh mọi rủi ro tràn/scroll ngang.
   - Luôn là 1 hàng, không xuống dòng: whitespace-nowrap + flex + truncate.
   - Mục cuối (tên app) có ellipsis "..." nếu quá dài.
   - Tự co giãn trong khung max-w-screen-2xl, overflow-x-hidden an toàn.

*/
function BreadcrumbModern({ category, appName }) {
  return (
    <div className="bg-gray-100">
      <div className="w-full flex justify-center px-2 sm:px-4 md:px-6">
        <nav
          className="w-full max-w-screen-2xl py-3 overflow-x-hidden"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1 text-sm text-slate-600 whitespace-nowrap">
            {/* Home */}
            <li className="flex items-center">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition"
                title="Trang chủ"
              >
                <FontAwesomeIcon icon={faHouse} className="w-4 h-4" />
                <span className="hidden sm:inline font-semibold">Home</span>
              </Link>
            </li>

            {/* Chevron */}
            <li className="px-1 text-slate-400">
              <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
            </li>

            {/* Category */}
            {category?.slug && (
              <>
                <li className="flex items-center">
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-flex items-center rounded-full px-3 py-1.5 bg-white/70 border border-slate-200 hover:bg-white transition max-w-[40vw] sm:max-w-[30vw]"
                    title={category.name || 'Chuyên mục'}
                  >
                    <span className="truncate font-semibold">{category.name || 'Chuyên mục'}</span>
                  </Link>
                </li>

                <li className="px-1 text-slate-400">
                  <FontAwesomeIcon icon={faChevronRight} className="w-3.5 h-3.5" />
                </li>
              </>
            )}

            {/* App (truncate, không xuống, không overflow) */}
            <li className="flex items-center min-w-0">
              <span
                className="inline-flex items-center rounded-full px-3 py-1.5 bg-white text-sky-700 border border-sky-300 shadow-sm max-w-[55vw] sm:max-w-[45vw] md:max-w-[50%] lg:max-w-[60%]"
                title={appName}
              >
                <span className="truncate font-semibold">{appName}</span>
              </span>
            </li>
          </ol>
        </nav>
      </div>
    </div>
  );
}

/* ===================== InfoRow ===================== */
const InfoRow = memo(({ label, value, expandable = false, expanded = false, onToggle }) => {
  return (
    <div className="px-4 py-3 flex items-start">
      <div className="w-40 min-w-[9rem] text-sm text-gray-500">{label}</div>
      <div className="flex-1 text-sm text-gray-800 min-w-0">
        <span className="align-top break-words">{value}</span>
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

/* ===================== Center Modal (generic) ===================== */
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

  const PAGE_SIZE = 5;
  const [relPage, setRelPage] = useState(1);
  const relTotalPages = Math.max(1, Math.ceil((related?.length || 0) / PAGE_SIZE));
  const relatedSlice = useMemo(() => {
    const start = (relPage - 1) * PAGE_SIZE;
    return (related || []).slice(start, start + PAGE_SIZE);
  }, [related, relPage]);

  // Markdown lazy
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

  const mdDescription = useMemo(
    () => normalizeDescription(app?.description || ''),
    [app?.description]
  );

  const [me, setMe] = useState(null);
  const [modal, setModal] = useState({ open: false, title: '', body: null, actions: null });

  const categorySlug = app?.category?.slug ?? null;
  const isTestflight = categorySlug === 'testflight';
  const isInstallable = ['jailbreak', 'app-clone'].includes(categorySlug);

  // Theo dõi auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  // Reset khi đổi slug
  useEffect(() => {
    setApp(serverApp);
    setRelated(serverRelated);
    setShowFullDescription(false);
    setDominantColor('#f0f2f5');
    setShowAllDevices(false);
    setShowAllLanguages(false);
    setRelPage(1);
  }, [router.query.slug, serverApp, serverRelated]);

  // View/TestFlight + màu nền
  useEffect(() => {
    if (!app?.id) return;

    if (isTestflight) {
      fetch('/api/admin/add-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: app.id }),
      }).catch(console.error);
    }

    if (isTestflight && app.testflight_url) {
      setStatusLoading(true);
      const id = app.testflight_url.split('/').pop();
      fetch(`/api/admin/check-slot?id=${id}`)
        .then(res => res.json())
        .then(data => data.success && setStatus(data.status))
        .catch(console.error)
        .finally(() => setStatusLoading(false));
    }

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

  /* ======= Thông báo "Cần đăng nhập" – mở đúng popup LoginButton của HEADER ======= */
  const requireLogin = () => {
    setModal({
      open: true,
      title: 'Cần đăng nhập',
      body: (
        <div className="text-sm">
          <p>Bạn cần <b>đăng nhập</b> để tải IPA.</p>
        </div>
      ),
      actions: (
        <>
          <button
            onClick={() => {
              setModal(s => ({ ...s, open: false }));
              try {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new Event('close-login'));
                  window.dispatchEvent(new Event('open-auth'));
                }
              } catch {}
            }}
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
          >
            Đăng nhập
          </button>
          <button
            onClick={() => setModal(s => ({ ...s, open: false }))}
            className="px-3 py-2 text-sm rounded border"
          >
            Đóng
          </button>
        </>
      ),
    });
  };

  /* ======= Thông báo "Cần xác minh email" ======= */
  const requireVerified = () => {
    setModal({
      open: true,
      title: 'Cần xác minh email',
      body: (
        <div className="text-sm">
          <p>Bạn cần <b>xác minh email</b> để tải IPA.</p>
          <p className="mt-1 text-xs text-gray-500">
            Không thấy email xác minh? Kiểm tra thư rác hoặc gửi lại từ trang{' '}
            <Link href="/profile" className="text-blue-600 underline">Hồ sơ</Link>.
          </p>
        </div>
      ),
      actions: (
        <>
          <button
            onClick={async () => {
              try {
                if (auth.currentUser && !auth.currentUser.emailVerified) {
                  await sendEmailVerification(auth.currentUser);
                  alert('Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.');
                }
              } catch (e) {
                alert('Không thể gửi email xác minh. Vui lòng thử lại.');
              }
            }}
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
          >
            Gửi lại email xác minh
          </button>
          <button
            onClick={() => setModal(s => ({ ...s, open: false }))}
            className="px-3 py-2 text-sm rounded border"
          >
            Đóng
          </button>
        </>
      ),
    });
  };

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

  const handleDownloadIpa = async (e) => {
    e.preventDefault();
    if (!app?.id || !isInstallable) return;

    if (!me) { requireLogin(); return; }
    if (!me.emailVerified) { requireVerified(); return; }

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

  // Auto-scroll highlight ?comment=
  useEffect(() => {
    const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('comment') : null;
    if (!id) return;

    let tried = 0;
    const maxTries = 40;
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
  const description = app.description ? app.description.replace(/<\/?[^>]+(>|$)/g, '').slice(0, 160) : 'Ứng dụng iOS miễn phí, jailbreak, TestFlight';

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

      {/* Modal thông báo */}
      <CenterModal open={modal.open} title={modal.title} body={modal.body} actions={modal.actions} />

      {/* ===== Breadcrumb mới hoàn toàn ===== */}
      <BreadcrumbModern category={app?.category} appName={app?.name} />

      <div className="bg-gray-100 min-h-screen pb-12 overflow-x-hidden">
        <div className="w-full flex justify-center mt-3 bg-gray-100">
          <div className="relative w-full max-w-screen-2xl px-2 sm:px-4 md:px-6 pb-8 bg-white rounded-none">
            <div
              className="w-full pb-6"
              style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}
            >
              <div className="absolute top-3 left-3 z-10">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-10 text-center px-4">
                <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl">
                  <img
                    src={app.icon_url || '/placeholder-icon.png'}
                    alt={app.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = '/placeholder-icon.png'; }}
                  />
                </div>

                {/* Tiêu đề: luôn 1 dòng, ellipsis; KHÔNG gây cuộn ngang */}
                <h1
                  className="mt-4 text-2xl font-bold text-gray-900 drop-shadow truncate mx-auto max-w-[92vw] sm:max-w-[80vw]"
                  title={app.name}
                >
                  {app.name}
                </h1>
                {app.author && (
                  <p className="text-gray-700 text-sm truncate mx-auto max-w-[80vw]" title={app.author}>
                    {app.author}
                  </p>
                )}

                {/* ===== Info stripe (mới) -- không tràn, không scroll ngang ===== */}
                <div className="mt-4 w-full flex justify-center">
                  <div className="bg-white/70 backdrop-blur rounded-xl px-2 py-2 w-full max-w-xl">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2">
                      {[
                        { label: 'Tác giả', icon: faUser, text: app.author || 'Không rõ' },
                        { label: 'Phiên bản', icon: faCodeBranch, text: app.version || 'Không rõ' },
                        { label: 'Dung lượng', icon: faDatabase, text: displaySize },
                        isTestflight
                          ? { label: 'Lượt xem', icon: null, text: String(app.views ?? 0) }
                          : { label: 'Lượt tải', icon: faDownload, text: String(app.downloads ?? 0) },
                      ].map((item, i) => (
                        <div key={i} className="flex flex-col items-center min-w-0">
                          <p className="text-[11px] font-semibold text-gray-500 uppercase">{item.label}</p>
                          {item.icon ? (
                            <FontAwesomeIcon icon={item.icon} className="text-base text-gray-600 my-0.5" />
                          ) : (
                            <span className="text-base text-gray-600 my-0.5 font-medium">•</span>
                          )}
                          <p className="text-sm text-gray-800 truncate max-w-[70vw] sm:max-w-[30vw]" title={item.text}>
                            {item.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* ===== Buttons ===== */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {/* TestFlight */}
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

                  {/* Install / IPA */}
                  {!isTestflight && (
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

        {/* ===== Nội dung dưới: bỏ mọi overflow-x-auto, chống tràn ===== */}
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6 space-y-6 overflow-x-hidden">
          {/* Mô tả */}
          <div className="bg-white rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold text-gray-800 mb-3">Mô tả</h2>
            <div className={`relative overflow-hidden transition-all duration-300 ${showFullDescription ? '' : 'max-h-72'}`}>
              <div className={`${showFullDescription ? '' : 'mask-gradient-bottom'}`}>
                {ReactMarkdown ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({...props}) => <h3 className="text-xl font-bold mt-3 mb-2" {...props} />,
                      h2: ({...props}) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
                      h3: ({...props}) => <h5 className="text-base font-bold mt-3 mb-2" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 leading-7 mb-3 break-words" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
                      li: ({...props}) => <li className="marker:text-blue-500" {...props} />,
                      a: ({...props}) => <a className="text-blue-600 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                      code: ({inline, ...props}) =>
                        inline ? (
                          <code className="px-1 py-0.5 rounded bg-gray-100 text-pink-700" {...props} />
                        ) : (
                          <pre className="p-3 rounded bg-gray-900 text-gray-100 overflow-auto mb-3"><code {...props} /></pre>
                        ),
                      blockquote: ({...props}) => <PrettyBlockquote {...props} />,
                      hr: () => <hr className="my-4 border-gray-200" />,
                    }}
                  >
                    {mdDescription}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-700 leading-7 mb-3 whitespace-pre-wrap break-words">{mdDescription}</p>
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
              <div className="flex gap-3 overflow-x-auto pb-1">
                {app.screenshots.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border">
                    <img
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="w-full h-auto object-cover"
                      onError={(e) => { e.currentTarget.src = '/placeholder-image.png'; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thông tin chi tiết (không tràn) */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <h2 className="px-4 pt-4 text-lg font-bold text-gray-800">Thông tin</h2>
            <div className="mt-3 divide-y divide-gray-200 overflow-x-hidden">
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
              <InfoRow
                label="Yêu cầu iOS"
                value={app.minimum_os_version ? `iOS ${app.minimum_os_version}+` : 'Không rõ'}
              />
              <InfoRow
                label="Ngày phát hành"
                value={
                  app.release_date
                    ? new Date(app.release_date).toLocaleDateString('vi-VN')
                    : 'Không rõ'
                }
              />
              <InfoRow
                label="Xếp hạng tuổi"
                value={app.age_rating || 'Không rõ'}
              />
            </div>
          </div>

          {/* Related + phân trang */}
          {related.length > 0 && (
            <div className="bg-white rounded-xl p-4 shadow overflow-x-hidden">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>

              <div className="divide-y divide-gray-200">
                {relatedSlice.map((item) => (
                  <Link
                    href={`/${item.slug}`}
                    key={item.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={item.icon_url || '/placeholder-icon.png'}
                        alt={item.name}
                        className="w-14 h-14 rounded-xl object-cover shadow-sm"
                        onError={(e) => { e.currentTarget.src = '/placeholder-icon.png'; }}
                      />
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate" title={item.name}>{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                          {item.author && <span className="truncate" title={item.author}>{item.author}</span>}
                          {item.version && (
                            <span className="bg-gray-200 text-gray-800 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0">
                              {item.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faDownload} className="text-blue-500 text-lg flex-shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setRelPage(p => Math.max(1, p - 1))}
                  disabled={relPage === 1}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50"
                >
                  Trang trước
                </button>
                <div className="text-sm text-gray-600">Trang {relPage}/{relTotalPages}</div>
                <button
                  onClick={() => setRelPage(p => Math.min(relTotalPages, p + 1))}
                  disabled={relTotalPages === relPage}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}

          {/* Bình luận */}
          <div className="bg-white rounded-xl p-4 shadow overflow-x-hidden">
            <Comments postId={app.slug} postTitle={app.name} />
          </div>

        </div>
      </div>
    </Layout>
  );
}