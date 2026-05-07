// pages/users/[uid].js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { auth, db } from '../../lib/firebase-client';
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, startAfter, getCountFromServer,
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCalendarAlt, faComment, faHeart, faSpinner,
  faShieldHalved, faUserSlash, faBan, faUnlock
} from '@fortawesome/free-solid-svg-icons';

/* ----------------- Helpers: time ----------------- */
function toDate(ts) {
  try {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'number' || typeof ts === 'string') return new Date(ts);
    if (ts instanceof Date) return ts;
  } catch {}
  return null;
}
const fmtDate = (ts) => {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
};
const fmtRel = (ts) => {
  const d = toDate(ts);
  if (!d) return '';
  const diff = (Date.now() - d.getTime())/1000;
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric:'auto' });
  const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
  for (const [u,s] of units) if (Math.abs(diff) >= s || u==='second') return rtf.format(Math.round(diff/s*-1), u);
  return '';
};

/* ----------------- BanBox (BAN vĩnh viễn / tạm thời) ----------------- */
function BanBox({ me, isAdmin, uid, banInfo, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState('permanent'); // 'permanent' | 'temporary'
  const [preset, setPreset] = useState('7d');    // '1d' | '7d' | '30d' | 'custom'
  const [customISO, setCustomISO] = useState(''); // yyyy-mm-ddThh:mm (local)
  const [reason, setReason] = useState('');

  if (!isAdmin || !uid) return null;

  const remainingText = (() => {
    if (!banInfo?.banned || !banInfo?.remainingMs) return '';
    const ms = banInfo.remainingMs;
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (d > 0) return `${d} ngày ${h} giờ`;
    if (h > 0) return `${h} giờ ${m} phút`;
    if (m > 0) return `${m} phút`;
    return `${s} giây`;
  })();

  const computeExpiresAtISO = () => {
    if (mode !== 'temporary') return null;
    if (preset === 'custom') {
      return customISO ? new Date(customISO).toISOString() : null;
    }
    const map = { '1d': 1, '7d': 7, '30d': 30 };
    const days = map[preset] || 7;
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  };

  const doAction = async (action) => {
    const label = action === 'ban'
      ? (mode === 'permanent' ? 'BAN VĨNH VIỄN tài khoản này?' : 'BAN TẠM THỜI tài khoản này?')
      : 'GỠ BAN tài khoản này?';
    if (!window.confirm(label)) return;

    try {
      setBusy(true);
      const body = { uid, action, reason: reason || undefined };
      if (action === 'ban') {
        body.mode = mode;
        if (mode === 'temporary') {
          const iso = computeExpiresAtISO();
          if (!iso) throw new Error('Vui lòng chọn thời hạn hợp lệ');
          body.expiresAtISO = iso;
        }
      }
      const idToken = await me.getIdToken();
      const resp = await fetch('/api/admin/ban-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify(body)
      });
      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || 'Thao tác thất bại');

      onChanged?.(json.banned, json);
      alert(action === 'ban' ? 'Đã BAN tài khoản.' : 'Đã gỡ BAN.');
    } catch (e) {
      alert(e.message || 'Lỗi không xác định');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-amber-700 dark:text-amber-300 inline-flex items-center gap-2">
            <FontAwesomeIcon icon={faBan} />
            Quản lý BAN tài khoản
          </h3>
          <p className="text-sm text-amber-900/80 dark:text-amber-200/80 mt-1">
            Trạng thái: {banInfo.loading ? 'Đang kiểm tra…' : (banInfo.banned ? 'ĐANG BỊ BAN' : 'Không bị ban')}
            {!banInfo.loading && banInfo.banned && (
              <>
                {' • Kiểu: '}<b>{banInfo.mode === 'temporary' ? 'Tạm thời' : 'Vĩnh viễn'}</b>
                {banInfo.mode === 'temporary' && banInfo.expiresAt && (
                  <> • Hết hạn: {new Date(banInfo.expiresAt).toLocaleString('vi-VN')} ({remainingText} còn lại)</>
                )}
                {banInfo.authDisabled ? ' • (Auth: disabled)' : ''}
              </>
            )}
          </p>
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => doAction('ban')}
            disabled={busy || banInfo.loading || banInfo.banned}
            className={`px-3 py-2 rounded-lg text-white ${busy || banInfo.banned ? 'bg-amber-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700'}`}
            title="Ban tài khoản"
          >
            <FontAwesomeIcon icon={faBan} className="mr-2" />
            Ban
          </button>
          <button
            onClick={() => doAction('unban')}
            disabled={busy || banInfo.loading || !banInfo.banned}
            className={`px-3 py-2 rounded-lg ${busy || !banInfo.banned ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'}`}
            title="Gỡ ban"
          >
            <FontAwesomeIcon icon={faUnlock} className="mr-2" />
            Unban
          </button>
        </div>
      </div>

      {/* Cấu hình trước khi BAN */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-amber-200 dark:border-amber-700 p-3">
          <label className="text-sm font-medium">Chế độ BAN</label>
          <div className="mt-2 flex flex-col gap-2 text-sm">
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="ban-mode" value="permanent" checked={mode==='permanent'} onChange={()=>setMode('permanent')} />
              Vĩnh viễn
            </label>
            <label className="inline-flex items-center gap-2">
              <input type="radio" name="ban-mode" value="temporary" checked={mode==='temporary'} onChange={()=>setMode('temporary')} />
              Tạm thời
            </label>
          </div>
        </div>

        {mode === 'temporary' && (
          <>
            <div className="rounded-md border border-amber-200 dark:border-amber-700 p-3">
              <label className="text-sm font-medium">Thời lượng</label>
              <select
                className="mt-2 w-full rounded-md border border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-black/20 px-2 py-2 text-sm"
                value={preset}
                onChange={e => setPreset(e.target.value)}
              >
                <option value="1d">1 ngày</option>
                <option value="7d">7 ngày</option>
                <option value="30d">30 ngày</option>
                <option value="custom">Tự chọn ngày/giờ</option>
              </select>
            </div>

            <div className="rounded-md border border-amber-200 dark:border-amber-700 p-3">
              <label className="text-sm font-medium">Hết hạn (nếu tự chọn)</label>
              <input
                type="datetime-local"
                className="mt-2 w-full rounded-md border border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-black/20 px-2 py-2 text-sm"
                value={customISO}
                onChange={e => setCustomISO(e.target.value)}
                disabled={preset !== 'custom'}
              />
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70 mt-1">
                Dùng múi giờ trình duyệt hiện tại của bạn.
              </p>
            </div>
          </>
        )}

        <div className="rounded-md border border-amber-200 dark:border-amber-700 p-3 sm:col-span-3">
          <label className="text-sm font-medium">Lý do (tuỳ chọn)</label>
          <input
            type="text"
            className="mt-2 w-full rounded-md border border-amber-300 dark:border-amber-700 bg-white/80 dark:bg-black/20 px-3 py-2 text-sm"
            placeholder="vd: spam, lạm dụng..."
            value={reason}
            onChange={e => setReason(e.target.value)}
          />
        </div>
      </div>
    </section>
  );
}

/* ----------------- AdminDangerZone ----------------- */
function AdminDangerZone({ me, isAdmin, uid, displayName }) {
  const [mode, setMode] = useState('all'); // 'auth' | 'data' | 'all'
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const needHard = useMemo(() => mode === 'data' || mode === 'all', [mode]);
  const needDeleteAuth = useMemo(() => mode === 'auth' || mode === 'all', [mode]);
  const canSubmit = useMemo(() => (needHard ? confirmText.trim() === String(uid) : true), [confirmText, needHard, uid]);

  if (!isAdmin || !uid) return null;

  const onSubmit = async () => {
    if (!me) return;
    if (!canSubmit) { alert('Vui lòng gõ đúng UID để xác nhận.'); return; }
    const ok = window.confirm(
      `Bạn chắc chắn muốn xoá ${mode === 'auth' ? 'TÀI KHOẢN (Auth)' : mode === 'data' ? 'DỮ LIỆU (Firestore)' : 'TẤT CẢ (Auth + Firestore)'} cho UID: ${uid}?`
    );
    if (!ok) return;

    try {
      setBusy(true);
      const idToken = await me.getIdToken();

      const params = new URLSearchParams({
        uid: String(uid),
        hard: needHard ? '1' : '0',
        deleteAuth: needDeleteAuth ? '1' : '0',
      });

      const resp = await fetch(`/api/admin/delete-user-data?${params.toString()}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${idToken}` }
      });

      const json = await resp.json();
      if (!resp.ok || !json.ok) throw new Error(json?.error || 'Không xoá được dữ liệu.');

      alert(
        `Thành công!\n` +
        `Chế độ: ${json.mode}\n` +
        `Xoá Auth: ${json.authDeleted}\n` +
        `Xoá user doc: ${json.userDocDeleted}\n` +
        `Comments xoá: ${json.stats?.commentsDeleted}\n` +
        `Likes gỡ: ${json.stats?.likesRemoved}\n` +
        `Thông báo xoá: ${json.stats?.notificationsDeleted}`
      );
      location.reload();
    } catch (e) {
      alert(e.message || 'Lỗi không xác định.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-8 rounded-2xl border border-rose-200 dark:border-rose-800 bg-rose-50/70 dark:bg-rose-900/20 p-6">
      <h3 className="font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2 text-lg">
        <FontAwesomeIcon icon={faShieldHalved} aria-hidden="true" />
        Khu vực nguy hiểm (Admin)
      </h3>
      <p className="text-sm text-rose-900/80 dark:text-rose-100/80 mt-1">
        Chọn thao tác xoá cho <b>{displayName || 'người dùng'}</b> (UID: <code>{uid}</code>).
      </p>

      <div className="mt-4 grid gap-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="delete-mode" value="auth"
            checked={mode === 'auth'} onChange={() => setMode('auth')} className="mt-1"/>
          <div>
            <div className="font-medium">Chỉ xoá Tài khoản (Auth)</div>
            <div className="text-xs text-rose-900/70 dark:text-rose-100/70">
              Xoá khỏi Firebase Authentication, GIỮ dữ liệu trong Firestore.
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="delete-mode" value="data"
            checked={mode === 'data'} onChange={() => setMode('data')} className="mt-1"/>
          <div>
            <div className="font-medium">Chỉ xoá Dữ liệu (Firestore)</div>
            <div className="text-xs text-rose-900/70 dark:text-rose-100/70">
              Xoá bình luận/thông báo/counters và <b>xoá hẳn</b> <code>users/{'{' }uid{'}'}</code> &amp; subcollections. GIỮ Auth.
            </div>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="radio" name="delete-mode" value="all"
            checked={mode === 'all'} onChange={() => setMode('all')} className="mt-1"/>
          <div>
            <div className="font-medium">Xoá tất cả (Auth + Firestore)</div>
            <div className="text-xs text-rose-900/70 dark:text-rose-100/70">
              Xoá tài khoản Auth và <b>xoá hẳn</b> mọi dữ liệu Firestore liên quan.
            </div>
          </div>
        </label>
      </div>

      {(mode === 'data' || mode === 'all') && (
        <div className="mt-4">
          <label className="text-sm font-medium">Xác nhận xoá dữ liệu</label>
          <p className="text-xs text-rose-900/70 dark:text-rose-100/70">
            Nhập chính xác UID <code>{uid}</code> để xác nhận:
          </p>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            placeholder={uid}
            className="mt-2 w-full rounded-md border border-rose-200 dark:border-rose-700 bg-white/80 dark:bg-black/20 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
      )}

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={onSubmit}
          disabled={busy || !canSubmit}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white ${
            busy || !canSubmit ? 'bg-rose-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700'
          }`}
        >
          {busy ? (
            <>
              <FontAwesomeIcon icon={faSpinner} className="animate-spin" aria-hidden="true" />
              Đang xử lý…
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faUserSlash} aria-hidden="true" />
              Thực hiện xoá
            </>
          )}
        </button>
        <span className="text-xs text-rose-700/80 dark:text-rose-300/80">Hành động không thể hoàn tác.</span>
      </div>
    </section>
  );
}

/* ----------------- Page ----------------- */
export default function PublicUser() {
  const { query: q } = useRouter();
  const uid = q.uid;

  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [user, setUser] = useState(null);
  const [memberSince, setMemberSince] = useState(null);
  const [totals, setTotals] = useState({ comments: 0, likes: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // trạng thái BAN
  const [banInfo, setBanInfo] = useState({
    loading: true, banned: false, authDisabled: false, reason: null, mode: null, expiresAt: null, remainingMs: null
  });

  /* ---- Auth state + kiểm tra admin ---- */
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setMe(u || null);
      if (!u) { setIsAdmin(false); return; }
      try {
        const snap = await getDoc(doc(db, 'app_config', 'admins'));
        const admins = Array.isArray(snap.data()?.uids) ? snap.data().uids : [];
        setIsAdmin(admins.includes(u.uid));
      } catch { setIsAdmin(false); }
    });
    return () => unsub();
  }, []);

  /* ---- Load trạng thái BAN (và auto-unban khi hết hạn qua endpoint) ---- */
  useEffect(() => {
    (async () => {
      if (!me || !isAdmin || !uid) { setBanInfo(s => ({ ...s, loading: false })); return; }
      try {
        const idToken = await me.getIdToken();
        const resp = await fetch(`/api/admin/ban-status?uid=${encodeURIComponent(String(uid))}`, {
          headers: { Authorization: `Bearer ${idToken}` }
        });
        const json = await resp.json();
        if (json?.ok) {
          setBanInfo({
            loading: false,
            banned: json.banned,
            authDisabled: json.authDisabled,
            reason: json.reason || null,
            mode: json.mode || null,
            expiresAt: json.expiresAt || null,
            remainingMs: json.remainingMs || null,
          });
        } else {
          setBanInfo({ loading: false, banned: false, authDisabled: false, reason: null, mode: null, expiresAt: null, remainingMs: null });
        }
      } catch {
        setBanInfo({ loading: false, banned: false, authDisabled: false, reason: null, mode: null, expiresAt: null, remainingMs: null });
      }
    })();
  }, [me, isAdmin, uid]);

  /* ---- Tính "Ngày tham gia": ưu tiên user.createdAt, fallback bình luận sớm nhất ---- */
  const resolveMemberSince = async (uid, udata) => {
    let join = udata?.createdAt || null;
    try {
      const firstQ = query(
        collection(db, 'comments'),
        where('authorId', '==', String(uid)),
        orderBy('createdAt', 'asc'),
        limit(1)
      );
      const snap = await getDocs(firstQ);
      if (!snap.empty) {
        const earliest = snap.docs[0].data().createdAt || null;
        const j = toDate(join)?.getTime() ?? Infinity;
        const e = toDate(earliest)?.getTime() ?? Infinity;
        if (!join || (e && e < j)) join = earliest;
      }
    } catch {}
    return join;
  };

  /* ---- Đếm tổng bình luận + tổng like nhận (cộng dồn likeCount) ---- */
  const computeTotals = async (uid) => {
    const cSnap = await getCountFromServer(query(collection(db, 'comments'), where('authorId','==',String(uid))));
    const comments = cSnap.data().count || 0;
    let likes = 0, cursor = null, fetched = 0, page = 250;
    while (true) {
      const qPage = cursor
        ? query(collection(db,'comments'), where('authorId','==',String(uid)), orderBy('createdAt','desc'), startAfter(cursor), limit(page))
        : query(collection(db,'comments'), where('authorId','==',String(uid)), orderBy('createdAt','desc'), limit(page));
      const s = await getDocs(qPage);
      if (s.empty) break;
      s.forEach(d => likes += Number(d.data().likeCount || 0));
      fetched += s.size;
      cursor = s.docs[s.docs.length - 1];
      if (s.size < page) break;
      if (fetched > 5000) break; // an toàn
    }
    return { comments, likes };
  };

  /* ---- Load dữ liệu hồ sơ ---- */
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true); setErr('');
        const uref = doc(db, 'users', String(uid));
        const usnap = await getDoc(uref);
        // ✅ CHẶN hồ sơ đã xoá (status === 'deleted') hoặc không tồn tại
        if (!usnap.exists() || usnap.data()?.status === 'deleted') {
          setErr('Không tìm thấy người dùng này.');
          setUser(null);
          return;
        }
        const udata = usnap.data();
        setUser(udata);

        // Bình luận gần đây (giới hạn 12) -- sửa link slug gốc
        const rcSnap = await getDocs(
          query(collection(db,'comments'), where('authorId','==',String(uid)), orderBy('createdAt','desc'), limit(12))
        );
        setRecent(rcSnap.docs.map(d => ({id:d.id, ...d.data()})));

        const [join, t] = await Promise.all([
          resolveMemberSince(uid, udata),
          computeTotals(uid)
        ]);
        setMemberSince(join);
        setTotals({ comments: t.comments, likes: t.likes });
      } catch (e) {
        console.error(e);
        setErr('Đã xảy ra lỗi khi tải dữ liệu người dùng.');
      } finally { setLoading(false); }
    })();
  }, [uid]);

  /* ---- Render ---- */
  if (loading) {
    return (
      <Layout fullWidth>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-400" />
          <p className="mt-4 text-gray-500">Đang tải hồ sơ người dùng...</p>
        </div>
      </Layout>
    );
  }

  if (err) {
    return (
      <Layout fullWidth>
        <Head>
          <meta name="robots" content="noindex" />
          <title>Lỗi – Hồ sơ người dùng</title>
        </Head>
        <div className="text-center py-20">
          <h1 className="text-xl font-bold text-rose-500">Lỗi</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{err}</p>
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  const { displayName, photoURL, bio, socialLinks } = user || {};
  const avatar = photoURL || null;

  return (
    <Layout fullWidth>
      <Head>
        <title>Hồ sơ của {displayName || 'Người dùng'}</title>
      </Head>

      {/* Container hẹp, tránh tràn ngang */}
      <div className="max-w-3xl mx-auto px-5 md:px-6 py-8 md:py-10 overflow-x-hidden">
        {/* Header profile */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden shrink-0">
              {avatar
                ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 text-gray-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight break-words">{displayName || 'Người dùng'}</h1>
              {bio && (
                <p className="mt-2 text-sm md:text-[15px] text-gray-600 dark:text-gray-400 leading-relaxed break-words">
                  {bio}
                </p>
              )}

              {/* Stat chips */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Ngày tham gia
                  </div>
                  <div className="mt-1 font-medium">{fmtDate(memberSince)}</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faComment} /> Tổng bình luận
                  </div>
                  <div className="mt-1 font-medium">{totals.comments}</div>
                </div>
                <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                  <div className="text-xs text-gray-500 flex items-center gap-2">
                    <FontAwesomeIcon icon={faHeart} /> Lượt thích nhận
                  </div>
                  <div className="mt-1 font-medium">{totals.likes}</div>
                </div>
              </div>

              {(socialLinks?.github || socialLinks?.twitter) && (
                <div className="mt-4 flex items-center gap-4 text-sm">
                  {socialLinks.github && (
                    <a className="hover:underline" href={`https://github.com/${socialLinks.github}`} target="_blank" rel="noreferrer">GitHub</a>
                  )}
                  {socialLinks.twitter && (
                    <a className="hover:underline" href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noreferrer">Twitter/X</a>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* QUẢN LÝ BAN */}
        <BanBox
          me={me}
          isAdmin={isAdmin}
          uid={uid}
          banInfo={banInfo}
          onChanged={(isBanned, payload) =>
            setBanInfo(s => ({
              ...s,
              banned: isBanned,
              mode: payload?.mode || s.mode,
              expiresAt: payload?.expiresAt || s.expiresAt,
              remainingMs: payload?.expiresAt ? (new Date(payload.expiresAt).getTime() - Date.now()) : null
            }))
          }
        />

        {/* Khu vực xoá dữ liệu */}
        <AdminDangerZone me={me} isAdmin={isAdmin} uid={uid} displayName={displayName} />

        {/* Bình luận gần đây */}
        {recent.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Bình luận gần đây</h2>
            <ul className="grid gap-3">
              {recent.map(c => {
                // Link đúng: /<slug>#comment-<id> (không có /post hay /app)
                const rawSlug = String(c.postSlug || c.postId || '').trim();
                const slug = rawSlug.replace(/^\/+/, '');
                const anchorHref = `/${encodeURI(slug)}#comment-${encodeURIComponent(c.id)}`;

                return (
                  <li key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 overflow-hidden">
                    <div className="text-xs text-gray-500">{fmtRel(c.createdAt)}</div>

                    {/* Văn bản bọc từ, không tràn ngang */}
                    <p className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words break-anywhere leading-relaxed">
                      {String(c.content || '')}
                    </p>

                    {slug && (
                      <div className="mt-3 text-sm">
                        <Link
                          href={anchorHref}
                          className="text-sky-700 hover:underline"
                          title="Mở bài viết và cuộn đến bình luận này"
                        >
                          Xem trong bài viết
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}