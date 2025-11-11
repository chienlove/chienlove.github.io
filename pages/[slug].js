// pages/[slug].js
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState, useMemo, memo } from 'react';
import { auth } from '../lib/firebase-client';
import { sendEmailVerification } from 'firebase/auth';
import Head from 'next/head';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faRocket,
  faArrowLeft,
  faDatabase,
  faUser,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faChevronDown,
  faChevronUp,
  faFileArrowDown,
  faHouse,
} from '@fortawesome/free-solid-svg-icons';

// Lazy-load Comments
const Comments = dynamic(() => import('../components/Comments'), {
  ssr: false,
  loading: () => <div className="text-sm text-gray-500 dark:text-gray-400">Đang tải bình luận…</div>,
});

/* ===================== SSR ===================== */
export async function getServerSideProps(context) {
  const slug = context.params.slug?.toLowerCase();

  // 1) Tìm kiếm chính
  let { data: appData, error } = await supabase
    .from('apps')
    .select(`
      *,
      category:categories!apps_category_id_fkey ( id, slug, name )
    `)
    .ilike('slug', slug)
    .single();

  // 2) Fallback bằng ID nếu không tìm thấy bằng slug
  if (!appData || error) {
    const { data: fbData } = await supabase
      .from('apps')
      .select(`
        *,
        category:categories!apps_category_id_fkey ( id, slug, name )
      `)
      .eq('id', slug)
      .single();

    if (fbData) {
      return { redirect: { destination: `/${fbData.slug}`, permanent: false } };
    }
    return { notFound: true };
  }

  // 3) Related apps
  const { data: relatedApps } = await supabase
    .from('apps')
    .select('id, name, slug, icon_url, author, version, category_id, downloads, views')
    .eq('category_id', appData.category_id)
    .neq('id', appData.id)
    .order('created_at', { ascending: false })
    .limit(20);

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

/* ====== BBCode → Markdown ====== */
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

  // [list]
  s = processListBlocks(s);

  // [quote]
  s = s.replace(new RegExp('\\[quote\\]\\s*([\\s\\S]*?)\\s*\\[/quote\\]', 'gi'), (_m, g1) => {
    return String(g1).trim().split(/\r?\n/).map(line => `> ${line}`).join('\n');
  });

  // [code]
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

/* ===================== BREADCRUMB ===================== */
function NewBreadcrumb({ category, appName }) {
  return (
    <div className="bg-gray-100 dark:bg-zinc-950">
      <div className="w-full flex justify-center px-2 sm:px-4 md:px-6">
        <nav className="w-full max-w-screen-2xl py-3 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
          <ol className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <li className="inline-flex items-center">
              <Link
                href="/"
                className="inline-flex items-center text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition"
                title="Trang chủ"
              >
                <FontAwesomeIcon icon={faHouse} className="w-4 h-4 mr-2" />
                Home
              </Link>
            </li>

            {category?.slug && (
              <>
                <li className="flex-shrink-0 text-gray-400 dark:text-gray-500">/</li>
                <li className="inline-flex items-center">
                  <Link
                    href={`/category/${category.slug}`}
                    className="text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 font-medium transition max-w-[150px] truncate"
                    title={category.name || 'Chuyên mục'}
                  >
                    {category.name || 'Chuyên mục'}
                  </Link>
                </li>
              </>
            )}

            <li className="flex-shrink-0 text-gray-400 dark:text-gray-500">/</li>
            <li className="text-blue-600 dark:text-blue-400 font-semibold max-w-[200px] sm:max-w-xs md:max-w-md truncate" title={appName}>
              {appName}
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
      <div className="w-40 min-w-[9rem] text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="flex-1 text-sm text-gray-800 dark:text-gray-100 min-w-0">
        <span className="align-top break-words">{value}</span>
        {expandable && (
          <button
            type="button"
            onClick={onToggle}
            className="ml-2 inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline"
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

/* ===================== Page ===================== */
export default function Detail({ serverApp, serverRelated }) {
  const router = useRouter();
  const app = serverApp;
  const related = serverRelated;

  // States
  const [dominantColor, setDominantColor] = useState('#f0f2f5');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [status, setStatus] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isFetchingIpa, setIsFetchingIpa] = useState(false);
  const [showAllDevices, setShowAllDevices] = useState(false);
  const [showAllLanguages, setShowAllLanguages] = useState(false);

  // Fallback ảnh với next/image
  const [iconError, setIconError] = useState(false);
  const iconSrc = iconError ? '/placeholder-icon.png' : (app?.icon_url || '/placeholder-icon.png');

  // chuẩn hoá URL tuyệt đối
  const toAbs = (src) => {
    if (!src) return '';
    return src.startsWith('http') ? src : `https://storeios.net${src}`;
  };

  // Pagination
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

  // ===== languages/devices =====
  const languagesArray = useMemo(() => parseList(app?.languages), [app?.languages]);
  const devicesArray   = useMemo(() => parseList(app?.supported_devices), [app?.supported_devices]);

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

  // ===================== DYNAMIC META TAGS =====================
  const displaySize = useMemo(() => {
    if (!app?.size) return 'Không rõ';
    const s = String(app.size);
    if (/\bMB\b/i.test(s)) return s;
    const n = Number(s);
    return !isNaN(n) ? `${n} MB` : s;
  }, [app?.size]);

  const dynamicMetaTags = useMemo(() => {
    if (!app) return null;

    const appName     = app.name || '';
    const version     = app.version ? ` ${app.version}` : '';
    const author      = app.author || '';
    const currentYear = String(new Date().getFullYear());
    const os          = app.minimum_os_version ? `iOS ${app.minimum_os_version}+` : 'iOS';

    const generateTitle = () => {
      const baseTitle = `Tải ${appName}${version} cho ${os} | ${currentYear} | StoreiOS`;

      if (categorySlug === 'jailbreak') {
        const jailbreakKeywords = 'Jailbreak IPA, Tweak';
        return `Tải ${appName}${version} - ${jailbreakKeywords} cho ${os} | StoreiOS`;
      }
      if (categorySlug === 'app-clone') {
        const cloneKeywords = 'App Clone IPA, Nhân bản, Đa tài khoản';
        return `Tải ${appName}${version} - ${cloneKeywords} cho ${os} | StoreiOS`;
      }
      return baseTitle;
    };

    const generateDescription = () => {
      const sizeText   = displaySize !== 'Không rõ' ? ` • Dung lượng ${displaySize}` : '';
      const authorText = author ? ` • Nhà phát triển ${author}` : '';
      const catName    = app.category?.name ? ` (${app.category.name})` : '';

      if (isTestflight) {
        return `${appName}${version}${catName} - Bản thử nghiệm TestFlight. Kiểm tra slot và tham gia ngay. Cập nhật ${currentYear}.`;
      }
      if (categorySlug === 'jailbreak') {
        return `${appName}${version}${catName} - Công cụ/ứng dụng jailbreak cho ${os}. Tải về an toàn${sizeText}${authorText}. Cập nhật ${currentYear}.`;
      }
      if (categorySlug === 'app-clone') {
        return `${appName}${version}${catName} - Ứng dụng nhân bản, đa tài khoản cho ${os}. Tải về an toàn${sizeText}${authorText}. Cập nhật ${currentYear}.`;
      }
      return `${appName}${version}${catName} - Ứng dụng iOS miễn phí${sizeText}${authorText}. Cài đặt nhanh, cập nhật ${currentYear}.`;
    };

    const generateKeywords = () => {
      const keywords = [
        `Tải ${appName}`, appName, 'IPA', 'iOS', 'download', 'tải về', 'miễn phí',
        currentYear, 'storeios', 'storeios.net'
      ];
      if (version) keywords.push(version.trim());
      if (author) keywords.push(author);
      if (isTestflight) keywords.push('testflight', 'tham gia');
      if (categorySlug === 'jailbreak') keywords.push('jailbreak', 'cydia', 'unc0ver', 'root', 'tweak');
      if (categorySlug === 'app-clone') keywords.push('app clone', 'nhân bản', 'đa tài khoản', 'dual app', 'cài app song song');
      return keywords.join(', ');
    };

    return { title: generateTitle(), description: generateDescription(), keywords: generateKeywords() };
  }, [app, isTestflight, categorySlug, displaySize]);

  // ===================== STRUCTURED DATA =====================
  const structuredData = useMemo(() => {
    if (!app) return null;

    return {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": app.name,
      "applicationCategory": "SoftwareApplication",
      "operatingSystem": "iOS",
      "description": dynamicMetaTags?.description || '',
      "image": app.icon_url,
      "author": { "@type": "Organization", "name": app.author },
      "datePublished": app.release_date,
      "softwareVersion": app.version,
      "fileSize": displaySize,
      "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
    };
  }, [app, dynamicMetaTags, displaySize]);

  // ===================== BREADCRUMB STRUCTURED DATA =====================
  const breadcrumbStructuredData = useMemo(() => {
    if (!app) return null;

    const itemListElement = [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://storeios.net" }
    ];

    if (app.category?.slug) {
      itemListElement.push({
        "@type": "ListItem",
        "position": 2,
        "name": app.category.name,
        "item": `https://storeios.net/category/${app.category.slug}`
      });
    }

    itemListElement.push({
      "@type": "ListItem",
      "position": itemListElement.length + 1,
      "name": app.name
    });

    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": itemListElement
    };
  }, [app]);

  // Auth
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

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
      (async () => {
        try {
          const { FastAverageColor } = await import('fast-average-color');
          const fac = new FastAverageColor();
          try {
            const color = await fac.getColorAsync(app.icon_url);
            setDominantColor(color.hex);
          } finally {
            fac.destroy();
          }
        } catch (err) {
          console.error('FAC error:', err);
        }
      })();
    }
  }, [app?.id, app?.icon_url, app?.testflight_url, isTestflight]);

  /* ======= Modal helpers ======= */
  const requireLogin = () => {
    setModal({
      open: true,
      title: 'Cần đăng nhập',
      body: (<div className="text-sm"><p>Bạn cần <b>đăng nhập</b> để tải IPA.</p></div>),
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
          <button onClick={() => setModal(s => ({ ...s, open: false }))} className="px-3 py-2 text-sm rounded border">
            Đóng
          </button>
        </>
      ),
    });
  };

  const requireVerified = () => {
    setModal({
      open: true,
      title: 'Cần xác minh email',
      body: (
        <div className="text-sm">
          <p>Bạn cần <b>xác minh email</b> để tải IPA.</p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Không thấy email xác minh? Kiểm tra thư rác hoặc gửi lại từ trang{' '}
            <Link href="/profile" className="text-blue-600 dark:text-blue-400 underline">Hồ sơ</Link>.
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
                  setModal({
                    open: true,
                    title: 'Đã gửi email',
                    body: 'Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.',
                    actions: <button onClick={() => setModal(s => ({ ...s, open: false }))} className="px-3 py-2 text-sm rounded border">Đóng</button>
                  });
                }
              } catch {
                setModal({
                  open: true,
                  title: 'Lỗi',
                  body: 'Không thể gửi email xác minh. Vui lòng thử lại.',
                  actions: <button onClick={() => setModal(s => ({ ...s, open: false }))} className="px-3 py-2 text-sm rounded border">Đóng</button>
                });
              }
            }}
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
          >
            Gửi lại email xác minh
          </button>
          <button onClick={() => setModal(s => ({ ...s, open: false }))} className="px-3 py-2 text-sm rounded border">
            Đóng
          </button>
        </>
      ),
    });
  };

  /* ======= Cài đặt / Tải IPA ======= */
  const handleInstall = (e) => {
    e.preventDefault();
    if (!app?.id || isTestflight) return;
    setIsInstalling(true);
    window.open(`/install/${app.slug}`, '_blank');
    setTimeout(() => setIsInstalling(false), 500);
  };

  const handleDownloadIpa = (e) => {
    e.preventDefault();
    if (!app?.id || !isInstallable) return;
    if (!me) { requireLogin(); return; }
    if (!me.emailVerified) { requireVerified(); return; }
    setIsFetchingIpa(true);
    window.open(`/install/${app.slug}?action=download`, '_blank');
    setTimeout(() => setIsFetchingIpa(false), 500);
  };

  // Cuộn tới bình luận
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const getTarget = () => {
      const hash = window.location.hash?.slice(1) || '';
      const q = new URLSearchParams(window.location.search).get('comment');
      return hash || (q ? `comment-${q}` : '');
    };

    const tryScroll = () => {
      const target = getTarget();
      if (!target) return false;

      const rawId = target.replace(/^comment-/, '').replace(/^c-/, '');
      const el =
        document.getElementById(`comment-${rawId}`) ||
        document.getElementById(`c-${rawId}`) ||
        document.querySelector(`[data-comment-id="${rawId}"]`);

      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        el.classList.add('ring-2', 'ring-sky-400', 'bg-sky-50');
        setTimeout(() => el.classList.remove('ring-2', 'ring-sky-400', 'bg-sky-50'), 3000);
        return true;
      }
      return false;
    };

    let tries = 0;
    const maxTries = 60;
    const iv = setInterval(() => {
      if (tryScroll() || ++tries >= maxTries) clearInterval(iv);
    }, 100);

    const onHash = () => setTimeout(tryScroll, 0);
    window.addEventListener('hashchange', onHash);

    return () => {
      clearInterval(iv);
      window.removeEventListener('hashchange', onHash);
    };
  }, [router.asPath]);

  if (!app) {
    return (
      <Layout fullWidth>
        <Head>
          <title key="title">Không tìm thấy ứng dụng - StoreiOS</title>
          <meta name="description" key="description" content="Ứng dụng bạn tìm kiếm không tồn tại. Khám phá hàng ngàn ứng dụng iOS miễn phí khác trên StoreiOS." />
          <meta name="robots" content="noindex, nofollow" key="robots" />
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-zinc-950">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Không tìm thấy ứng dụng</h1>
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

  const absIcon = toAbs(iconSrc);
  const absOg = toAbs(app.icon_url || '/og-default.png');

  return (
    <Layout fullWidth>
      {/* ===================== SEO META TAGS ===================== */}
      <Head>
  {/* ✅ Base SEO - Dùng dynamicMetaTags fallback */}
  <title>{dynamicMetaTags?.title || `${app.name} - StoreiOS`}</title>
  <meta name="description" content={dynamicMetaTags?.description || app.description?.slice(0, 160)} />
  <meta name="keywords" content={dynamicMetaTags?.keywords || 'iOS, TestFlight, Jailbreak, StoreiOS'} />

  {/* ✅ Open Graph - DÙNG URL GỐC CHO ẢNH */}
  <meta property="og:title" content={dynamicMetaTags?.title || app.name} />
  <meta property="og:description" content={dynamicMetaTags?.description || app.description?.slice(0, 160)} />
  
  {/* 🔥 FIX: Dùng URL trực tiếp, không qua /_next/image */}
  <meta property="og:image" content={app.icon_url || 'https://storeios.net/og-default.png'} />
  <meta property="og:image:secure_url" content={app.icon_url || 'https://storeios.net/og-default.png'} />
  <meta property="og:image:alt" content={`Icon của ứng dụng ${app.name}`} />
  <meta property="og:image:type" content="image/png" />
  <meta property="og:image:width" content="512" />
  <meta property="og:image:height" content="512" />
  
  <meta property="og:url" content={`https://storeios.net/${app.slug}`} />
  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="StoreiOS" />
  <meta property="og:locale" content="vi_VN" />

  {/* ✅ Twitter Card */}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={dynamicMetaTags?.title || app.name} />
  <meta name="twitter:description" content={dynamicMetaTags?.description || app.description?.slice(0, 160)} />
  <meta name="twitter:image" content={app.icon_url || 'https://storeios.net/og-default.png'} />
  <meta name="twitter:site" content="@storeios" />

  {/* ✅ Canonical */}
  <link rel="canonical" href={`https://storeios.net/${app.slug}`} />

  {/* ✅ Preload icon chính (vẫn dùng để tối ưu UI) */}
  <link rel="preload" href={absIcon} as="image" />
  {app.screenshots?.[0] && <link rel="preload" href={toAbs(app.screenshots[0])} as="image" />}
</Head>


      {/* ===================== STRUCTURED DATA ===================== */}
      {structuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      )}
      {breadcrumbStructuredData && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }} />
      )}

      {/* ===== simple Center Modal ===== */}
      {modal.open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-[92vw] max-w-md rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-4">
            {modal.title && <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{modal.title}</h3>}
            <div className="text-sm text-gray-800 dark:text-gray-100">{modal.body}</div>
            <div className="mt-4 flex justify-end gap-2">{modal.actions}</div>
          </div>
        </div>
      )}

      {/* ===== Breadcrumb ===== */}
      <NewBreadcrumb category={app?.category} appName={app?.name} />

      <div className="bg-gray-100 dark:bg-zinc-950 min-h-screen pb-12 overflow-x-hidden">
        <div className="w-full flex justify-center mt-3">
          <div className="relative w-full max-w-screen-2xl px-2 sm:px-4 md:px-6 pb-8 bg-white dark:bg-zinc-900 rounded-none">
            {/* Header gradient */}
            <div
              className="relative w-full pb-6"
              style={{ backgroundImage: `linear-gradient(to bottom, ${dominantColor}, #f0f2f5)` }}
            >
              <div className="absolute inset-0 pointer-events-none hidden dark:block bg-black/30" />
              <div className="absolute top-3 left-3 z-10">
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-9 h-9 text-blue-600 hover:text-white bg-white hover:bg-blue-600 active:scale-95 transition-all duration-150 rounded-full shadow-sm"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="w-4 h-4" />
                </Link>
              </div>

              <div className="pt-10 text-center px-4">
                <div className="w-24 h-24 mx-auto overflow-hidden border-4 border-white rounded-2xl relative">
                  <Image
                    src={absIcon}
                    alt={`Icon của ứng dụng ${app.name}`}
                    fill
                    sizes="96px"
                    priority
                    onError={() => setIconError(true)}
                    className="object-cover"
                  />
                </div>

                {/* Title */}
                <h1
                  className="mt-4 text-2xl font-bold text-gray-900 dark:text-gray-100 drop-shadow truncate mx-auto max-w-[92vw] sm:max-w-[80vw]"
                  title={app.name}
                >
                  {app.name}
                </h1>
                {app.author && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm truncate mx-auto max-w-[80vw]" title={app.author}>
                    {app.author}
                  </p>
                )}

                {/* Buttons */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {isTestflight && app.testflight_url && (
                    <>
                      <a
                        href={app.testflight_url}
                        className="inline-block border border-blue-500 text-blue-700 dark:text-blue-400 dark:border-blue-400/60 hover:bg-blue-100 dark:hover:bg-blue-400/10 transition px-4 py-2 rounded-full text-sm font-semibold"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <FontAwesomeIcon icon={faRocket} className="mr-2" />
                        Tham gia TestFlight
                      </a>
                      {statusLoading || status === null ? (
                        <span className="inline-block border border-gray-300 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-white/5 px-4 py-2 rounded-full text-sm font-semibold">
                          Đang kiểm tra...
                        </span>
                      ) : status === 'Y' ? (
                        <span className="inline-block border border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-400/10 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                          Còn slot
                        </span>
                      ) : status === 'F' ? (
                        <span className="inline-block border border-red-500 text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-400/10 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                          Đã đầy
                        </span>
                      ) : (
                        <span className="inline-block border border-yellow-500 text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-400/10 px-4 py-2 rounded-full text-sm font-semibold">
                          <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
                          Ngừng nhận
                        </span>
                      )}
                    </>
                  )}

                  {!isTestflight && (
                    <>
                      <button
                        onClick={handleInstall}
                        disabled={isInstalling}
                        className={`inline-flex items-center border border-green-500 text-green-700 dark:text-green-400 dark:border-green-400/60 transition px-4 py-2 rounded-full text-sm font-semibold active:scale-95 active:bg-green-200 dark:active:bg-green-400/10 active:shadow-inner active:ring-2 active:ring-green-500 ${isInstalling ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-100 dark:hover:bg-green-400/10'}`}
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
                        className={`inline-flex items-center border border-blue-500 text-blue-700 dark:text-blue-400 dark:border-blue-400/60 transition px-4 py-2 rounded-full text-sm font-semibold active:scale-95 active:bg-blue-200 dark:active:bg-blue-400/10 active:shadow-inner active:ring-2 active:ring-blue-500 ${isFetchingIpa ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-100 dark:hover:bg-blue-400/10'}`}
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

        {/* Nội dung dưới */}
        <div className="max-w-screen-2xl mx-auto px-2 sm:px-4 md:px-6 mt-6 space-y-6 overflow-x-hidden">

          {/* Info cards */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow text-center">
            <div className="-mx-2 overflow-x-auto sm:overflow-visible px-2">
              <div className="flex sm:grid sm:grid-cols-5 divide-x divide-gray-200 dark:divide-zinc-700 snap-x snap-mandatory">
                {/* Tác giả */}
                <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Tác giả</p>
                  <div className="h-[36px] flex items-center justify-center">
                    <FontAwesomeIcon icon={faUser} fixedWidth className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate w-full mt-1.5" title={app.author || 'Không rõ'}>
                    {app.author || 'Không rõ'}
                  </p>
                </div>

                {/* Phiên bản */}
                <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Phiên bản</p>
                  <div className="text-xl font-bold leading-none text-gray-500 dark:text-gray-400 h-[36px] flex items-center justify-center" title={app.version || 'Không rõ'}>
                    {app.version || '--'}
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1.5">Đã cập nhật</p>
                </div>

                {/* Dung lượng */}
                <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Dung lượng</p>
                  <div className="h-[36px] flex items-center justify-center">
                    <FontAwesomeIcon icon={faDatabase} fixedWidth className="w-8 h-8 text-gray-500 dark:text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate w-full mt-1.5" title={displaySize}>
                    {displaySize}
                  </p>
                </div>

                {/* Chỉ số */}
                {isTestflight ? (
                  <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4 col-span-2">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Lượt xem</p>
                    <div className="text-xl font-bold leading-none text-gray-500 dark:text-gray-400 h-[36px] flex items-center justify-center">
                      {new Intl.NumberFormat('vi-VN').format(app?.views ?? 0)}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-500 mt-1.5">Lượt</p>
                  </div>
                ) : (
                  <>
                    <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Cài đặt</p>
                      <div className="text-xl font-bold leading-none text-gray-500 dark:text-gray-400 h-[36px] flex items-center justify-center">
                        {new Intl.NumberFormat('vi-VN').format(app?.installs ?? 0)}
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-500 mt-1.5">Lượt</p>
                    </div>
                    <div className="flex-none w-1/3 sm:w-auto snap-start flex flex-col items-center min-w-0 px-2 sm:px-4">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Tải IPA</p>
                      <div className="text-xl font-bold leading-none text-gray-500 dark:text-gray-400 h-[36px] flex items-center justify-center">
                        {new Intl.NumberFormat('vi-VN').format(app?.downloads ?? 0)}
                      </div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-500 mt-1.5">Lượt</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mô tả */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Mô tả</h2>
            <div className={`relative overflow-hidden transition-all duration-300 ${showFullDescription ? '' : 'max-h-72'}`}>
              <div className={`${showFullDescription ? '' : 'mask-gradient-bottom'}`}>
                {ReactMarkdown ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({...props}) => <h3 className="text-xl font-bold mt-3 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
                      h2: ({...props}) => <h4 className="text-lg font-bold mt-3 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
                      h3: ({...props}) => <h5 className="text-base font-bold mt-3 mb-2 text-gray-900 dark:text-gray-100" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 dark:text-gray-200 leading-7 mb-3 break-words" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-5 space-y-1 mb-3 text-gray-700 dark:text-gray-200" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1 mb-3 text-gray-700 dark:text-gray-200" {...props} />,
                      li: ({...props}) => <li className="marker:text-blue-500" {...props} />,
                      a: ({...props}) => <a className="text-blue-600 dark:text-blue-400 hover:underline break-all" target="_blank" rel="noopener noreferrer" {...props} />,
                      code: ({inline, ...props}) =>
                        inline ? (
                          <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-pink-700 dark:text-pink-300" {...props} />
                        ) : (
                          <pre className="p-3 rounded bg-gray-900 text-gray-100 overflow-auto mb-3"><code {...props} /></pre>
                        ),
                      blockquote: ({...props}) => <PrettyBlockquote {...props} />,
                      hr: () => <hr className="my-4 border-gray-200 dark:border-zinc-800" />,
                    }}
                  >
                    {mdDescription}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-700 dark:text-gray-200 leading-7 mb-3 whitespace-pre-wrap break-words">{mdDescription}</p>
                )}
              </div>
              {!showFullDescription && (
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white via-white to-transparent dark:from-zinc-900 dark:via-zinc-900 dark:to-transparent" />
              )}
            </div>
            {app?.description && app.description.length > 300 && (
              <button
                onClick={() => setShowFullDescription(v => !v)}
                className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-bold"
              >
                {showFullDescription ? 'Thu gọn' : 'Xem thêm...'}
              </button>
            )}
          </div>

          {/* Screenshots */}
          {Array.isArray(app.screenshots) && app.screenshots.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-3">Ảnh màn hình</h2>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {app.screenshots.map((url, i) => (
                  <div key={i} className="flex-shrink-0 w-48 md:w-56 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800 relative">
                    <Image
                      src={toAbs(url)}
                      alt={`Ảnh chụp màn hình ${i + 1} của ứng dụng ${app.name}`}
                      width={224}
                      height={400}
                      className="object-cover w-full h-auto"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Thông tin */}
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow overflow-hidden">
            <h2 className="px-4 pt-4 text-lg font-bold text-gray-800 dark:text-gray-100">Thông tin</h2>
            <div className="mt-3 divide-y divide-gray-200 dark:divide-zinc-800">
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
                value={app.release_date ? new Date(app.release_date).toLocaleDateString('vi-VN') : 'Không rõ'}
              />
              <InfoRow label="Xếp hạng tuổi" value={app.age_rating || 'Không rõ'} />
            </div>
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="bg-white dark:bg-zinc-900 rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Ứng dụng cùng chuyên mục</h2>

              <div className="divide-y divide-gray-200 dark:divide-zinc-800">
                {relatedSlice.map((item) => (
                  <Link
                    href={`/${item.slug}`}
                    key={item.id}
                    className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-white/5 px-2 rounded-lg transition"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden shadow-sm relative flex-shrink-0 border border-gray-200 dark:border-zinc-800">
                        <Image
                          src={toAbs(item.icon_url || '/placeholder-icon.png')}
                          alt={`Icon của ứng dụng liên quan ${item.name}`}
                          width={56}
                          height={56}
                          className="object-cover w-full h-full"
                        />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate" title={item.name}>{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 min-w-0">
                          {item.author && <span className="truncate" title={item.author}>{item.author}</span>}
                          {item.version && (
                            <span className="bg-gray-200 dark:bg-zinc-800 text-gray-800 dark:text-gray-100 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0">
                              {item.version}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <FontAwesomeIcon icon={faDownload} className="text-blue-500 dark:text-blue-400 text-lg flex-shrink-0" />
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() => setRelPage(p => Math.max(1, p - 1))}
                  disabled={relPage === 1}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-100"
                >
                  Trang trước
                </button>
                <div className="text-sm text-gray-600 dark:text-gray-300">Trang {relPage}/{relTotalPages}</div>
                <button
                  onClick={() => setRelPage(p => Math.min(relTotalPages, p + 1))}
                  disabled={relTotalPages === relPage}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-gray-100"
                >
                  Trang sau
                </button>
              </div>
            </div>
          )}

          {/* Bình luận */}
          <Comments postId={app.slug} postTitle={app.name} />
        </div>
      </div>
    </Layout>
  );
}