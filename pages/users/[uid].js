// pages/users/[uid].js
import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { db } from '../../lib/firebase-client';
import {
  collection, doc, getDoc, getDocs, query, where, orderBy, limit,
  getCountFromServer, startAfter
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faComment, faHeart, faCalendarAlt, faMedal, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';

// ===== Helpers =====
function toDate(ts) {
  if (!ts) return null;
  try {
    if (ts.toDate) return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'number' || typeof ts === 'string') return new Date(ts);
    if (ts instanceof Date) return ts;
  } catch {}
  return null;
}
function formatDate(ts) {
  const d = toDate(ts);
  return d ? d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' }) : '';
}
function formatRelative(ts) {
  const d = toDate(ts);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
  const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
  for (const [unit, sec] of units) {
    if (Math.abs(diff) >= sec || unit === 'second') return rtf.format(Math.round(diff / sec * -1), unit);
  }
  return '';
}
function Badge({ icon, label, color, condition }) {
  if (!condition) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${color}`}>
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

export default function PublicUserProfile() {
  const { query: q } = useRouter();
  const uid = q.uid;
  const [user, setUser] = useState(null);
  const [recentComments, setRecentComments] = useState([]);
  const [memberSince, setMemberSince] = useState(null);
  const [totals, setTotals] = useState({ comments: 0, likesReceived: 0 });
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // --- tính ngày tham gia: ưu tiên user.createdAt; nếu không có/không chuẩn thì lấy comment sớm nhất
  async function resolveMemberSince(uid, userDoc) {
    let join = userDoc?.createdAt || null; // trước đây code chỉ dùng createdAt nên hay sai ngày hiện tại  [oai_citation:9‡[uid].js](file-service://file-KMNAP8W2YhTK9kHxkWDkxP)
    try {
      const qEarliest = query(
        collection(db, 'comments'),
        where('authorId', '==', String(uid)),
        orderBy('createdAt', 'asc'),
        limit(1)
      );
      const snap = await getDocs(qEarliest);
      if (!snap.empty) {
        const earliest = snap.docs[0].data().createdAt || null;
        const j = toDate(join)?.getTime() ?? Infinity;
        const e = toDate(earliest)?.getTime() ?? Infinity;
        if (!join || (e && e < j)) join = earliest;
      }
    } catch {}
    return join;
  }

  // --- đếm tổng bình luận & cộng tổng like nhận
  async function computeTotals(uid) {
    // 1) Tổng bình luận (chuẩn nhất)
    const countSnap = await getCountFromServer(
      query(collection(db, 'comments'), where('authorId', '==', String(uid)))
    );
    const comments = countSnap.data().count || 0;

    // 2) Tổng lượt thích nhận (cộng dồn likeCount các comment, có phân trang)
    let likes = 0;
    let cursor = null;
    const pageSize = 200; // an toàn & đủ nhanh
    let fetched = 0, hardCap = 1000; // tránh tải quá nhiều

    while (fetched < hardCap) {
      const qPage = cursor
        ? query(
            collection(db, 'comments'),
            where('authorId', '==', String(uid)),
            orderBy('createdAt', 'desc'),
            startAfter(cursor),
            limit(pageSize)
          )
        : query(
            collection(db, 'comments'),
            where('authorId', '==', String(uid)),
            orderBy('createdAt', 'desc'),
            limit(pageSize)
          );
      const snap = await getDocs(qPage);
      if (snap.empty) break;
      snap.forEach(d => { likes += Number(d.data().likeCount || 0); });
      fetched += snap.size;
      cursor = snap.docs[snap.docs.length - 1];
      if (snap.size < pageSize) break;
    }

    return { comments, likesReceived: likes };
  }

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true); setErr('');
        // lấy users/{uid}
        const uref = doc(db, 'users', String(uid));
        const usnap = await getDoc(uref);
        if (!usnap.exists()) { setErr('Không tìm thấy người dùng này.'); return; }
        const udata = usnap.data();
        setUser(udata);

        // recent 10 comments
        const rcSnap = await getDocs(
          query(
            collection(db, 'comments'),
            where('authorId', '==', String(uid)),
            orderBy('createdAt', 'desc'),
            limit(10)
          )
        );
        const rc = rcSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setRecentComments(rc);

        // ngày tham gia & totals chuẩn
        const [join, totals] = await Promise.all([
          resolveMemberSince(uid, udata),
          computeTotals(uid),
        ]);
        setMemberSince(join);
        setTotals(totals);
      } catch (e) {
        console.error(e);
        setErr('Đã xảy ra lỗi khi tải dữ liệu người dùng.');
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-400" />
          <p className="mt-4 text-gray-500">Đang tải hồ sơ người dùng...</p>
        </div>
      </Layout>
    );
  }
  if (err) {
    return (
      <Layout>
        <div className="text-center py-20">
          <h1 className="text-xl font-bold text-rose-500">Lỗi</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">{err}</p>
        </div>
      </Layout>
    );
  }
  if (!user) return null;

  const { displayName, photoURL, bio, socialLinks } = user;
  const avatar = photoURL || null;
  const isVeteran = !!memberSince && (Date.now() - (toDate(memberSince)?.getTime() || 0)) > 365*24*60*60*1000;

  return (
    <Layout>
      <Head>
        <title>Hồ sơ của {displayName} – StoreiOS</title>
        <meta name="description" content={`Xem hồ sơ và hoạt động của ${displayName} trên StoreiOS.`} />
      </Head>

      <div className="max-w-screen-lg mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-8">
          {/* ===== Sidebar ===== */}
          <aside className="md:sticky top-24 self-start space-y-6">
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4">
                {avatar
                  ? <img src={avatar} alt={`avatar của ${displayName}`} referrerPolicy="no-referrer"
                         className="w-full h-full rounded-full object-cover" />
                  : <FontAwesomeIcon icon={faUserCircle} className="w-20 h-20 text-gray-400" />
                }
              </div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{bio}</p>}

              {(socialLinks?.github || socialLinks?.twitter) && (
                <div className="flex items-center gap-4 mt-4">
                  {socialLinks.github && (
                    <a href={`https://github.com/${socialLinks.github}`} target="_blank" rel="noopener noreferrer"
                       title="GitHub" className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                      <FontAwesomeIcon icon={faGithub} className="w-5 h-5" />
                    </a>
                  )}
                  {socialLinks.twitter && (
                    <a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noopener noreferrer"
                       title="Twitter/X" className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                      <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <h3 className="font-bold mb-3">Thành tích</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FontAwesomeIcon icon={faCalendarAlt} /> Ngày tham gia
                  </span>
                  <span className="font-medium">{formatDate(memberSince)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FontAwesomeIcon icon={faComment} /> Tổng bình luận
                  </span>
                  <span className="font-medium">{totals.comments}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <FontAwesomeIcon icon={faHeart} /> Lượt thích nhận
                  </span>
                  <span className="font-medium">{totals.likesReceived}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <Badge icon={faMedal} label="Thành viên kỳ cựu"
                       color="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300"
                       condition={isVeteran} />
                <Badge icon={faMedal} label="Người hoạt ngôn"
                       color="bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300"
                       condition={totals.comments >= 10} />
                <Badge icon={faMedal} label="Được yêu mến"
                       color="bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300"
                       condition={totals.likesReceived >= 20} />
              </div>
            </div>
          </aside>

          {/* ===== Main ===== */}
          <main>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Bình luận gần đây</h2>
              {recentComments.length ? (
                <ul className="space-y-4">
                  {recentComments.map(c => {
                    // Ưu tiên đường dẫn đã lưu (nếu có), fallback về /tools/:id
                    const postHref = c.postUrl || `/tools/${c.postSlug || c.postId}#c-${c.id}`;
                    return (
                      <li key={c.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                        <p className="text-sm whitespace-pre-wrap break-words italic">"{c.content}"</p>
                        <div className="text-xs text-gray-500 mt-2">
                          Trong bài viết{' '}
                          <Link href={postHref} className="text-blue-600 hover:underline">này</Link>
                          <span className="mx-1">&middot;</span>
                          {formatRelative(c.createdAt)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Người dùng này chưa có bình luận công khai nào.</p>
              )}
            </div>
          </main>
        </div>
      </div>
    </Layout>
  );
}