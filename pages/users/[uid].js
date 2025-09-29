// pages/users/[uid].js
import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { db } from '../../lib/firebase-client';
import {
  collection, doc, getDoc, getDocs,
  query, where, orderBy, limit, startAfter, getCountFromServer
} from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faCalendarAlt, faComment, faHeart, faSpinner
} from '@fortawesome/free-solid-svg-icons';

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

export default function PublicUser() {
  const { query: q } = useRouter();
  const uid = q.uid;
  const [user, setUser] = useState(null);
  const [memberSince, setMemberSince] = useState(null);
  const [totals, setTotals] = useState({ comments: 0, likes: 0 });
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Tính "Ngày tham gia": ưu tiên user.createdAt, fallback bình luận sớm nhất
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

  // Đếm tổng bình luận + tổng like nhận (cộng dồn likeCount)
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

        // Bình luận gần đây
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

      {/* khung rộng hơn: 2xl + padding thoáng */}
      <div className="max-w-screen-2xl mx-auto px-6 md:px-8 py-8 md:py-10">
        {/* Header profile, 1 đường viền duy nhất */}
        <section className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 flex items-center justify-center overflow-hidden">
              {avatar
                ? <img src={avatar} alt="avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                : <FontAwesomeIcon icon={faUserCircle} className="w-16 h-16 text-gray-400" />
              }
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-2xl md:text-3xl font-bold">{displayName || 'Người dùng'}</h1>
              {bio && <p className="mt-2 text-sm md:text-[15px] text-gray-600 dark:text-gray-400">{bio}</p>}

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
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

        {/* Bình luận gần đây */}
        {recent.length > 0 && (
          <section className="mt-8">
            <h2 className="text-lg font-semibold mb-3">Bình luận gần đây</h2>
            <ul className="grid md:grid-cols-2 gap-3">
              {recent.map(c => (
                <li key={c.id} className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4">
                  <div className="text-sm text-gray-600 dark:text-gray-300">{fmtRel(c.createdAt)}</div>
                  <p className="mt-1 text-gray-800 dark:text-gray-100 whitespace-pre-wrap break-words">
                    {String(c.content || '').slice(0, 200)}
                    {String(c.content || '').length > 200 ? '…' : ''}
                  </p>
                  {c.postId && (
                    <div className="mt-2 text-sm">
                      <Link href={`/posts/${c.postId}`} className="text-sky-700 hover:underline">Xem bài viết</Link>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Layout>
  );
}