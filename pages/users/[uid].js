// pages/users/[uid].js
import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { db } from '../../lib/firebase-client';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserCircle, faComment, faHeart, faCalendarAlt, faMedal, faLink,
  faExternalLinkAlt, faSpinner
} from '@fortawesome/free-solid-svg-icons';
import { faGithub, faTwitter } from '@fortawesome/free-brands-svg-icons';
import Link from 'next/link';

// Helper: Định dạng ngày
function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Helper: Định dạng thời gian tương đối
function formatRelativeTime(ts) {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = (Date.now() - d.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const units = [['year',31536000],['month',2592000],['week',604800],['day',86400],['hour',3600],['minute',60],['second',1]];
    for (const [unit, sec] of units) {
      if (Math.abs(diff) >= sec || unit === 'second') {
        return rtf.format(Math.round(diff / sec * -1), unit);
      }
    }
    return '';
}

// Component Huy hiệu
function Badge({ icon, label, color, condition }) {
  if (!condition) return null;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${color}`}>
      <FontAwesomeIcon icon={icon} className="w-4 h-4" />
      <span>{label}</span>
    </div>
  );
}

export default function UserProfilePage() {
  const router = useRouter();
  const { uid } = router.query;
  const [userData, setUserData] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Lấy dữ liệu người dùng
        const userDocRef = doc(db, 'users', uid);
        const userDocSnap = await getDoc(userDocRef);

        if (!userDocSnap.exists()) {
          setError('Không tìm thấy người dùng này.');
          setLoading(false);
          return;
        }
        const fetchedUserData = userDocSnap.data();
        setUserData(fetchedUserData);

        // Lấy các bình luận gần đây của người dùng
        const commentsQuery = query(
          collection(db, 'comments'),
          where('authorId', '==', uid),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const commentsSnap = await getDocs(commentsQuery);
        setComments(commentsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

      } catch (err) {
        console.error("Error fetching user data:", err);
        setError('Đã xảy ra lỗi khi tải dữ liệu người dùng.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <FontAwesomeIcon icon={faSpinner} className="animate-spin text-4xl text-gray-400" />
        <p className="mt-4 text-gray-500">Đang tải hồ sơ người dùng...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-bold text-rose-500">Lỗi</h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">{error}</p>
      </div>
    );
  }

  if (!userData) return null;

  const { displayName, photoURL, bio, socialLinks, stats, createdAt } = userData;
  const avatar = photoURL || null;
  const memberSince = createdAt;
  const isVeteran = memberSince && (new Date() - memberSince.toDate()) > 365 * 24 * 60 * 60 * 1000;
  const userStats = stats || { comments: 0, likesReceived: 0 };

  return (
    <>
      <Head>
        <title>Hồ sơ của {displayName} – StoreiOS</title>
        <meta name="description" content={`Xem hồ sơ và hoạt động của ${displayName} trên StoreiOS.`} />
      </Head>

      <div className="max-w-screen-lg mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-[280px,1fr] gap-8">
          {/* ===== CỘT TRÁI (SIDEBAR) ===== */}
          <aside className="md:sticky top-24 self-start space-y-6">
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-100 dark:bg-gray-800 mb-4">
                {avatar ? (
                  <img src={avatar} alt={`avatar của ${displayName}`} className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <FontAwesomeIcon icon={faUserCircle} className="w-20 h-20 text-gray-400" />
                )}
              </div>
              <h1 className="text-2xl font-bold">{displayName}</h1>
              {bio && <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{bio}</p>}

              {(socialLinks?.github || socialLinks?.twitter) && (
                <div className="flex items-center gap-4 mt-4">
                  {socialLinks.github && (
                    <a href={`https://github.com/${socialLinks.github}`} target="_blank" rel="noopener noreferrer" title="GitHub" className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                      <FontAwesomeIcon icon={faGithub} className="w-5 h-5" />
                    </a>
                   )}
                  {socialLinks.twitter && (
                    <a href={`https://twitter.com/${socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" title="Twitter/X" className="text-gray-500 hover:text-gray-800 dark:hover:text-white">
                      <FontAwesomeIcon icon={faTwitter} className="w-5 h-5" />
                    </a>
                   )}
                </div>
              )}
            </div>

            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <h3 className="font-bold mb-3">Thành tích</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faCalendarAlt} /> Ngày tham gia</span> <span className="font-medium">{formatDate(memberSince)}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faComment} /> Tổng bình luận</span> <span className="font-medium">{userStats.comments}</span></div>
                <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-gray-600 dark:text-gray-400"><FontAwesomeIcon icon={faHeart} /> Lượt thích nhận</span> <span className="font-medium">{userStats.likesReceived}</span></div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                  <Badge icon={faMedal} label="Thành viên kỳ cựu" color="bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300" condition={isVeteran} />
                  <Badge icon={faMedal} label="Người hoạt ngôn" color="bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300" condition={userStats.comments >= 10} />
                  <Badge icon={faMedal} label="Được yêu mến" color="bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-300" condition={userStats.likesReceived >= 20} />
              </div>
            </div>
          </aside>

          {/* ===== CỘT PHẢI (NỘI DUNG CHÍNH) ===== */}
          <main>
            <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Bình luận gần đây</h2>
              {comments.length > 0 ? (
                <ul className="space-y-4">
                  {comments.map(c => (
                    <li key={c.id} className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                      <p className="text-sm whitespace-pre-wrap break-words italic">"{c.content}"</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Trong bài viết{' '}
                        <Link href={`/apps/${c.postId}#c-${c.id}`} className="text-blue-600 hover:underline">
                          này
                        </Link>
                        <span className="mx-1">&middot;</span>
                        {formatRelativeTime(c.createdAt)}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">Người dùng này chưa có bình luận công khai nào.</p>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
