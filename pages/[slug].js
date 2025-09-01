'use client';

import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Comments from '../components/Comments';
import { useEffect, useState, useMemo, memo } from 'react';
import { FastAverageColor } from 'fast-average-color';
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
import Head from 'next/head';

// Firebase (để mở popup đăng nhập nội bộ)
import { auth } from '../lib/firebase-client';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from 'firebase/auth';

// ===================== SSR =====================
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
    .select('id, name, slug, icon_url, author, version')
    .eq('category_id', appData.category_id)
    .neq('id', appData.id)
    .order('id', { ascending: false })
    .limit(50);

  return {
    props: {
      serverApp: appData,
      serverRelated: relatedApps ?? [],
    },
  };
}

// ===================== Helpers =====================

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

  s = s.replace(/\[b\](.*?)\[\/b\]/gi, '**$1**');
  s = s.replace(/\[i\](.*?)\[\/i\]/gi, '*$1*');
  s = s.replace(/\[u\](.*?)\[\/u\]/gi, '__$1__');

  s = s.replace(/\[url\](https?:\/\/[^\s\]]+)\[\/url\]/gi, '[$1]($1)');
  s = s.replace(/\[url=(https?:\/\/[^\]\s]+)\](.*?)\[\/url\]/gi, '[$2]($1)');

  s = s.replace(/\[img\](https?:\/\/[^\s\]]+)\[\/img\]/gi, '![]($1)');

  s = stripSimpleTagAll(s, 'color');
  s = stripSimpleTagAll(s, 'size');

  s = processListBlocks(s);

  const quoteR = new RegExp('\\[quote\\]\\s*([\\s\\S]*?)\\s*\\[/quote\\]', 'gi');
  s = s.replace(quoteR, (_m, p1) => {
    return String(p1).trim().split(/\r?\n/).map(line => `> ${line}`).join('\n');
  });

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

// ===================== Center Modal (generic) =====================
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

// ===================== Auth Modal nội bộ (mở thẳng form) =====================
function AuthModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const doGoogle = async () => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      onClose();
    } catch (e) {
      setMsg(e.message || 'Không thể đăng nhập Google.');
    } finally { setLoading(false); }
  };

  const doGithub = async () => {
    setLoading(true); setMsg('');
    try {
      await signInWithPopup(auth, new GithubAuthProvider());
      onClose();
    } catch (e) {
      setMsg(e.message || 'Không thể đăng nhập GitHub.');
    } finally { setLoading(false); }
  };

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setLoading(true); setMsg('');
    try {
      if (mode === 'signup') {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        try { await sendEmailVerification(user); } catch {}
        onClose();
        alert('Đăng ký thành công! Hãy kiểm tra email để xác minh.');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      }
    } catch (e) {
      setMsg(e.message || 'Có lỗi xảy ra.');
    } finally { setLoading(false); }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <svg className="w-5 h-5" viewBox="0 0 20 20"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div className="px-5 pt-5 pb-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button onClick={doGoogle} disabled={loading}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
              G
              <span>Google</span>
            </button>
            <button onClick={doGithub} disabled={loading}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded bg-gray-900 text-white hover:bg-black disabled:opacity-60">
              GH
              <span>GitHub</span>
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500">-- hoặc --</div>

          <form onSubmit={onSubmitEmail} className="mt-3 space-y-2">
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
                   className="w-full px-3 py-2 rounded border bg-white" />
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mật khẩu"
                   className="w-full px-3 py-2 rounded border bg-white" />
            {msg && <p className="text-xs text-rose-600">{msg}</p>}
            <div className="flex items-center justify-between">
              <button type="submit" disabled={loading}
                      className="px-3 py-2 rounded bg-gray-900 text-white">{mode==='signup' ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
              <button type="button" onClick={()=>setMode(m=>m==='login'?'signup':'login')}
                      className="text-sm underline">{mode==='login'?'Đăng ký bằng email':'Đã có tài khoản? Đăng nhập'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ===================== InfoRow =====================
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

// ===================== Page =====================
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

  // trạng thái đăng nhập
  const [me, setMe] = useState(null);

  // modal xác minh + auth modal nội bộ
  const [modal, setModal] = useState({ open: false, title: '', body: null, actions: null });
  const [authOpen, setAuthOpen] = useState(false);

  // phân trang related
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil((related?.length || 0) / pageSize));
  const relatedPage = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (related || []).slice(start, start + pageSize);
  }, [related, page]);

  const categorySlug = app?.category?.slug ?? null;
  const isTestflight = categorySlug === 'testflight';
  const isInstallable = ['jailbreak', 'app-clone'].includes(categorySlug);

  // dynamic import ReactMarkdown để giảm bundle
  const [ReactMarkdown, setReactMarkdown] = useState(null);
  const [remarkGfm, setRemarkGfm] = useState(null);
  useEffect(() => {
    Promise.all([
      import('react-markdown').then(m => m.default),
      import('remark-gfm').then(m => m.default),
    ]).then(([md, gfm]) => {
      setReactMarkdown(() => md);
      setRemarkGfm(() => gfm);
    });
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(setMe);
    return () => unsub();
  }, []);

  useEffect(() => {
    setApp(serverApp);
    setRelated(serverRelated);
    setShowFullDescription(false);
    setDominantColor('#f0f2f5');
    setShowAllDevices(false);
    setShowAllLanguages(false);
    setPage(1);
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

  // ======= Modal "Cần xác minh" + Login
  const openVerifyModal = () => {
    setModal({
      open: true,
      title: 'Cần xác minh email',
      body: (
        <div className="text-sm">
          <p>Bạn cần <b>đăng nhập</b> và <b>xác minh email</b> để tải IPA.</p>
          <p className="mt-1 text-xs text-gray-500">
            Không thấy email xác minh? Hãy kiểm tra thư rác hoặc gửi lại từ trang{' '}
            <Link href="/profile" className="text-blue-600 underline">Hồ sơ</Link>.
          </p>
        </div>
      ),
      actions: (
        <>
          <button
            onClick={() => { setAuthOpen(true); setModal(s => ({ ...s, open: false })); }}
            className="px-3 py-2 text-sm rounded bg-gray-900 text-white"
          >
            Đăng nhập
          </button>
          <button
            onClick={async () => {
              try {
                if (auth.currentUser && !auth.currentUser.emailVerified) {
                  await sendEmailVerification(auth.currentUser);
                  alert('Đã gửi lại email xác minh. Vui lòng kiểm tra hộp thư.');
                } else {
                  setAuthOpen(true);
                }
              } catch (e) {
                alert('Không thể gửi email xác minh. Vui lòng thử lại.');
              }
            }}
            className="px-3 py-2 text-sm rounded border"
          >
            Gửi lại email xác minh
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

    // ------ Logic chuẩn:
    // Chưa đăng nhập -> mở AuthModal
    if (!me) {
      setAuthOpen(true);
      return;
    }
    // Đã đăng nhập nhưng chưa verify -> yêu cầu xác minh
    if (!me.emailVerified) {
      openVerifyModal();
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

      // Tải qua proxy
      window.location.href = `/api/download-ipa?slug=${encodeURIComponent(app.slug)}&token=${encodeURIComponent(token)}`;

      // Ghi log tải phụ
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
    const id = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('comment') : null;
    if (!id) return;

    let tried = 0;
    const maxTries = 40; // ~2s
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

  // ====== CSS breadcrumb (mũi tên) ======
  const ArrowItem = ({ href, children, current }) => {
    // dùng clip-path tạo mũi tên; item cuối (current) là rỗng nền, có viền
    const base = current
      ? 'bg-white text-blue-600 border-2 border-blue-500'
      : 'bg-blue-500 text-white border-2 border-blue-500';
    const textClamp = 'max-w-[40vw] md:max-w-[28vw] truncate';
    return (
      <div className="relative inline-flex items-center h-10">
        <div
          className={`px-4 ${base} h-10 flex items-center rounded-l-lg select-none whitespace-nowrap ${textClamp}`}
          style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)' }}
        >
          {href && !current ? (
            <Link href={href} className="block">
              {children}
            </Link>
          ) : (
            <span className="block">{children}</span>
          )}
        </div>
        {/* đệm nhỏ để tạo cảm giác arrow tách nhau, không cần ký tự '>' */}
        <div className="w-1" />
      </div>
    );
  };

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

      {/* Auth Modal nội bộ */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Modal verify / hướng dẫn */}
      <CenterModal open={modal.open} title={modal.title} body={modal.body} actions={modal.actions} />

      {/* ===== Breadcrumb mũi tên (không xuống dòng, không cuộn ngang) ===== */}
      <div className="bg-gray-100">
        <div className="w-full flex justify-center px-2 sm:px-4 md:px-6">
          <nav className="w-full max-w-screen-2xl py-3 overflow-hidden">
            <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
              <ArrowItem href="/">
                <span className="hidden sm:inline">Home</span>
                <span className="sm:hidden"><FontAwesomeIcon icon={faHouse} /></span>
              </ArrowItem>

              {app?.category?.slug && (
                <ArrowItem href={`/category/${app.category.slug}`}>
                  <span className="truncate">{app.category.name || 'Chuyên mục'}</span>
                </ArrowItem>
              )}

              <ArrowItem current>
                <span className="truncate">{app.name}</span>
              </ArrowItem>
            </div>
          </nav>
        </div>
      </div>

      <div className="bg-gray-100 min-h-screen pb-12">
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
                    onError={(e) => { e.target.src = '/placeholder-icon.png'; }}
                  />
                </div>
                <h1 className="mt-4 text-2xl font-bold text-gray-900 drop-shadow truncate">{app.name}</h1>
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
                {ReactMarkdown ? (
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({...props}) => <h3 className="text-xl font-bold mt-3 mb-2" {...props} />,
                      h2: ({...props}) => <h4 className="text-lg font-bold mt-3 mb-2" {...props} />,
                      h3: ({...props}) => <h5 className="text-base font-bold mt-3 mb-2" {...props} />,
                      p: ({...props}) => <p className="text-gray-700 leading-7 mb-3" {...props} />,
                      ul: ({...props}) => <ul className="list-disc pl-5 space-y-1 mb-3" {...props} />,
                      ol: ({...props}) => <ol className="list-decimal pl-5 space-y-1 mb-3" {...props} />,
                      li: ({...props}) => <li className="marker:text-blue-500" {...props} />,
                      a: ({...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
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
                    {normalizeDescription(app.description)}
                  </ReactMarkdown>
                ) : (
                  <p className="text-gray-700 leading-7 mb-3 whitespace-pre-wrap">{normalizeDescription(app.description)}</p>
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
                value=
                {
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
            <div className="bg-white rounded-xl p-4 shadow">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Ứng dụng cùng chuyên mục</h2>

              <div className="divide-y divide-gray-200">
                {relatedPage.map((item) => (
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
                        onError={(e) => { e.target.src = '/placeholder-icon.png'; }}
                      />
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {item.author && <span className="truncate">{item.author}</span>}
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
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50"
                >
                  Trang trước
                </button>
                <div className="text-sm text-gray-600">Trang {page}/{totalPages}</div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 rounded border text-sm disabled:opacity-50"
                >
                  Trang sau
                </button>
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