// pages/users/[uid].js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { auth, db } from '../../lib/firebase-client';
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, startAfter, getCountFromServer
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCalendarAlt, faComment, faHeart, faSpinner,
  faShieldHalved, faUserSlash
} from '@fortawesome/free-solid-svg-icons';

/* ----------------- Helpers ----------------- */
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

/* ----------------- AdminDangerZone ----------------- */
function AdminDangerZone({ me, isAdmin, uid, displayName }) {
  const [mode, setMode] = useState('all'); // 'auth' | 'data' | 'all'
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);

  const needHard = useMemo(() => mode === 'data' || mode === 'all', [mode]);
  const needDeleteAuth = useMemo(() => mode === 'auth' || mode === 'all', [mode]);

  const canSubmit = useMemo(() => {
    // Bắt buộc gõ đúng UID khi xoá dữ liệu (hard) để an toàn
    if (needHard) return confirmText.trim() === String(uid);
    return true;
  }, [confirmText, needHard, uid]);

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

      // Nếu đã hard-delete user doc, reload sẽ chuyển sang "Không tìm thấy người dùng này."
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

      {/* Chọn chế độ */}
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
              Xoá bình luận/thông báo/counters và <b>xoá hẳn</b> users/{{'{uid}'}} & subcollections. GIỮ Auth.
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

      {/* Xác nhận khi hard delete */}
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

        // Bình luận gần đây (giới hạn 12)
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
          {/* Không index trang lỗi hồ sơ */}
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

        {/* Khu vực quản trị (đẹp & rõ ràng) */}
        <AdminDangerZone me={me} isAdmin={isAdmin} uid={uid} displayName={displayName} />

        {/* Bình luận gần đây */}
        {recent.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Bình luận gần đây</h2>
            <ul className="grid gap-3">
              {recent.map(c => {
                // Link đến post + anchor tới comment để trang bài viết có thể cuộn đúng vị trí
                const anchorHref = `/posts/${c.postId}#comment-${c.id}`;
                // Nếu dự án dùng route động kiểu [id]: có thể dùng <Link href={{ pathname:'/posts/[id]', query:{ id:c.postId }, hash:`comment-${c.id}` }} />
                return (
                  <li key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 overflow-hidden">
                    <div className="text-xs text-gray-500">{fmtRel(c.createdAt)}</div>

                    {/* Văn bản bọc từ, không tràn ngang */}
                    <p className="mt-2 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words break-anywhere leading-relaxed">
                      {String(c.content || '')}
                    </p>

                    {c.postId && (
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