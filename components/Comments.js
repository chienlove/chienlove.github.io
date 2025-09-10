// components/Comments.js
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../lib/firebase-client';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  arrayUnion,
  arrayRemove,
  increment,
  getDocs,
  startAfter,
  writeBatch
} from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPaperPlane,
  faReply,
  faTrash,
  faUserCircle,
  faQuoteLeft,
  faHeart
} from '@fortawesome/free-solid-svg-icons';

/* ================= Helpers ================= */
function preferredName(user) {
  if (!user) return 'Người dùng';
  const p0 = user.providerData?.[0];
  return user.displayName || user.email || p0?.displayName || p0?.email || 'Người dùng';
}

function preferredPhoto(user) {
  return user?.photoURL || user?.providerData?.[0]?.photoURL || '';
}

function formatDate(ts) {
  try {
    let d = null;
    if (!ts) return '';
    if (ts.seconds) d = new Date(ts.seconds * 1000);
    else if (typeof ts === 'number') d = new Date(ts);
    else if (typeof ts === 'string') d = new Date(ts);
    else if (ts instanceof Date) d = ts;
    if (!d) return '';

    const diff = (Date.now() - d.getTime()) / 1000;
    const rtf = new Intl.RelativeTimeFormat('vi', { numeric: 'auto' });
    const units = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1]
    ];

    for (const [unit, sec] of units) {
      if (Math.abs(diff) >= sec || unit === 'second') {
        const val = Math.round((diff / sec) * -1);
        return {
          rel: rtf.format(val, unit),
          abs: d.toLocaleString('vi-VN')
        };
      }
    }
    return { rel: '', abs: d.toLocaleString('vi-VN') };
  } catch {
    return '';
  }
}

function excerpt(s, n = 140) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/* ================= Admin Helper Functions ================= */
async function isUserAdmin(uid) {
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() && userSnap.data().isAdmin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/* ================= Notifications ================= */
async function bumpCounter(uid, delta) {
  if (!uid || !Number.isFinite(delta)) return;
  const ref = doc(db, 'user_counters', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const cur = snap.exists() ? (snap.data().unreadCount || 0) : 0;
    tx.set(
      ref,
      {
        unreadCount: Math.max(0, cur + delta),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  });
}

async function createNotification(payload = {}) {
  const { toUserId, type, postId, commentId, fromUserId, ...extra } = payload;
  if (!toUserId) return;

  await addDoc(collection(db, 'notifications'), {
    toUserId,
    type, // 'comment' | 'reply'
    postId,
    commentId,
    isRead: false,
    createdAt: serverTimestamp(),
    fromUserId,
    ...extra
  });
}

/** Like notification: idempotent + cooldown.
 * Một cặp (toUserId, commentId, fromUserId) chỉ có 1 doc:
 * notifications/like_{to}_{cmt}_{from}
 * - Trong cooldown (mặc định 60s): chỉ refresh updatedAt, KHÔNG tăng badge
 * - Hết cooldown hoặc lần đầu: setDoc + bumpCounter(+1)
 */
async function upsertLikeNotification({
  toUserId,
  postId,
  commentId,
  fromUser,
  cooldownSec = 60
}) {
  if (!toUserId || !commentId || !fromUser) return;
  if (toUserId === fromUser.uid) return; // không tự notify chính mình

  const nid = `like_${toUserId}_${commentId}_${fromUser.uid}`;
  const nref = doc(db, 'notifications', nid);
  const snap = await getDoc(nref);

  let shouldBumpCounter = true;
  if (snap.exists()) {
    const d = snap.data();
    const updatedAt = d?.updatedAt?.seconds ? d.updatedAt.seconds * 1000 : 0;
    const withinCooldown = Date.now() - updatedAt < cooldownSec * 1000;
    if (withinCooldown) shouldBumpCounter = false;
  }

  await setDoc(
    nref,
    {
      toUserId,
      type: 'like',
      postId: String(postId),
      commentId,
      fromUserId: fromUser.uid,
      fromUserName: preferredName(fromUser),
      fromUserPhoto: preferredPhoto(fromUser),
      updatedAt: serverTimestamp(),
      createdAt: snap?.exists()
        ? snap.data().createdAt || serverTimestamp()
        : serverTimestamp(),
      isRead: false
    },
    { merge: true }
  );

  if (shouldBumpCounter) {
    await bumpCounter(toUserId, +1);
  }
}

/* ================= Users bootstrap ================= */
async function ensureUserDoc(u) {
  if (!u) return;
  const uref = doc(db, 'users', u.uid);
  const snap = await getDoc(uref);

  const base = {
    uid: u.uid,
    email: u.email || '',
    displayName: preferredName(u),
    photoURL: preferredPhoto(u),
    updatedAt: serverTimestamp()
  };

  if (!snap.exists()) {
    await setDoc(
      uref,
      {
        ...base,
        createdAt: serverTimestamp(),
        stats: {
          comments: 0,
          likesReceived: 0
        }
      },
      { merge: true }
    );
  } else {
    await setDoc(uref, base, { merge: true });
  }
}

/* ================= Delete Comment Function ================= */
async function deleteComment(commentId, postId, commentData) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Bạn cần đăng nhập để xóa comment');
  }

  try {
    // Kiểm tra quyền: chủ comment hoặc admin
    const isOwner = commentData.userId === user.uid;
    const isAdmin = await isUserAdmin(user.uid);
    
    if (!isOwner && !isAdmin) {
      throw new Error('Bạn không có quyền xóa comment này');
    }

    // Xóa comment
    const commentRef = doc(db, 'posts', postId, 'comments', commentId);
    await deleteDoc(commentRef);

    // Cập nhật thống kê user (giảm số comment)
    if (commentData.userId) {
      const userRef = doc(db, 'users', commentData.userId);
      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (userSnap.exists()) {
          const currentStats = userSnap.data().stats || {};
          tx.update(userRef, {
            'stats.comments': Math.max(0, (currentStats.comments || 0) - 1),
            updatedAt: serverTimestamp()
          });
        }
      });
    }

    // Xóa các notification liên quan đến comment này
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('commentId', '==', commentId)
    );
    const notificationSnaps = await getDocs(notificationsQuery);
    
    if (!notificationSnaps.empty) {
      const batch = writeBatch(db);
      notificationSnaps.forEach((doc) => {
        batch.delete(doc.ref);
      });
      await batch.commit();
    }

    return true;
  } catch (error) {
    console.error('Lỗi xóa comment:', error);
    throw error;
  }
}

/* ================= CenterModal (alert/confirm) ================= */
function CenterModal({ open, title, children, onClose, actions, tone = 'info' }) {
  if (!open) return null;

  const toneClass =
    tone === 'success'
      ? 'border-emerald-300 bg-emerald-50'
      : tone === 'error'
      ? 'border-rose-300 bg-rose-50'
      : tone === 'warning'
      ? 'border-amber-300 bg-amber-50'
      : 'border-sky-300 bg-sky-50';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`mx-4 w-full max-w-md rounded-2xl border p-6 shadow-2xl ${toneClass}`}>
        <h3 className="mb-3 text-lg font-semibold text-gray-800">{title}</h3>
        <div className="mb-4 text-gray-700">{children}</div>
        <div className="flex justify-end gap-2">{actions}</div>
      </div>
    </div>
  );
}

/* ================= UserAvatar ================= */
function UserAvatar({ userName, userPhoto, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base'
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getAvatarColor = (name) => {
    const colors = [
      'bg-gradient-to-br from-orange-500 to-red-500',
      'bg-gradient-to-br from-blue-500 to-cyan-500',
      'bg-gradient-to-br from-green-500 to-emerald-500',
      'bg-gradient-to-br from-indigo-500 to-blue-500',
      'bg-gradient-to-br from-pink-500 to-rose-500',
      'bg-gradient-to-br from-teal-500 to-green-500',
      'bg-gradient-to-br from-yellow-500 to-orange-500',
      'bg-gradient-to-br from-slate-500 to-gray-500'
    ];
    const index = (name || '').length % colors.length;
    return colors[index];
  };

  return (
    <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
      {userPhoto ? (
        <img
          src={userPhoto}
          alt={userName || 'User avatar'}
          className="h-full w-full rounded-full object-cover ring-2 ring-white shadow-lg"
        />
      ) : (
        <div
          className={`${
            sizeClasses[size]
          } ${getAvatarColor(
            userName
          )} flex items-center justify-center rounded-full text-white font-medium ring-2 ring-white shadow-lg`}
        >
          {getInitials(userName)}
        </div>
      )}
    </div>
  );
}

/* ================= Main Comments Component ================= */
export default function Comments({ postId, postTitle = '' }) {
  const [user, setUser] = useState(null);
  const [userIsAdmin, setUserIsAdmin] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState(null);
  const [modalActions, setModalActions] = useState(null);
  const [modalTone, setModalTone] = useState('info');

  const textareaRef = useRef(null);
  const replyTextareaRef = useRef(null);

  const COMMENTS_LIMIT = 10;

  // Auth state
  useEffect(() => {
    const unsubAuth = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await ensureUserDoc(u);
        // Check if user is admin
        const adminStatus = await isUserAdmin(u.uid);
        setUserIsAdmin(adminStatus);
      } else {
        setUserIsAdmin(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // Load comments
  useEffect(() => {
    if (!postId) return;

    const q = query(
      collection(db, 'posts', postId, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(COMMENTS_LIMIT)
    );

    const unsubComments = onSnapshot(q, (snapshot) => {
      const commentsList = [];
      snapshot.forEach((doc) => {
        commentsList.push({ id: doc.id, ...doc.data() });
      });

      setComments(commentsList);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === COMMENTS_LIMIT);
    });

    return () => unsubComments();
  }, [postId]);

  const loadMoreComments = async () => {
    if (!lastDoc || !hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const q = query(
        collection(db, 'posts', postId, 'comments'),
        orderBy('createdAt', 'desc'),
        startAfter(lastDoc),
        limit(COMMENTS_LIMIT)
      );

      const snapshot = await getDocs(q);
      const moreComments = [];
      snapshot.forEach((doc) => {
        moreComments.push({ id: doc.id, ...doc.data() });
      });

      setComments((prev) => [...prev, ...moreComments]);
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === COMMENTS_LIMIT);
    } catch (error) {
      console.error('Error loading more comments:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const openLoginPrompt = (message = 'Vui lòng đăng nhập để tiếp tục.') => {
    setModalTitle('Cần đăng nhập');
    setModalContent(
      <p>
        Bạn cần <strong>đăng nhập</strong> để thực hiện thao tác này.
      </p>
    );
    setModalTone('warning');
    setModalActions(
      <>
        <button
          onClick={() => setModalOpen(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Đóng
        </button>
        <Link href="/auth/login">
          <button className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Đăng nhập
          </button>
        </Link>
      </>
    );
    setModalOpen(true);
  };

  const openVerifyPrompt = () => {
    setModalTitle('Cần xác minh email');
    setModalContent(
      <div>
        <p className="mb-3">
          Tài khoản của bạn <strong>chưa được xác minh email</strong>. Vui lòng
          xác minh để có thể bình luận.
        </p>
        <p className="text-sm text-gray-600">
          Không thấy email? Hãy kiểm tra thư rác hoặc gửi lại.
        </p>
      </div>
    );
    setModalTone('warning');
    setModalActions(
      <>
        <button
          onClick={() => setModalOpen(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Để sau
        </button>
        <button
          onClick={async () => {
            try {
              await sendEmailVerification(auth.currentUser);
              setModalOpen(false);
              alert('Email xác minh đã được gửi!');
            } catch (error) {
              console.error('Error sending verification:', error);
              alert('Có lỗi xảy ra khi gửi email xác minh.');
            }
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Gửi email xác minh
        </button>
      </>
    );
    setModalOpen(true);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!user) {
      openLoginPrompt();
      return;
    }

    if (!user.emailVerified) {
      openVerifyPrompt();
      return;
    }

    if (!newComment.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'posts', postId, 'comments'), {
        content: newComment.trim(),
        userId: user.uid,
        userName: preferredName(user),
        userPhoto: preferredPhoto(user),
        createdAt: serverTimestamp(),
        likesCount: 0,
        likedBy: []
      });

      // Update user stats
      const userRef = doc(db, 'users', user.uid);
      await runTransaction(db, async (tx) => {
        const userSnap = await tx.get(userRef);
        if (userSnap.exists()) {
          const currentStats = userSnap.data().stats || {};
          tx.update(userRef, {
            'stats.comments': (currentStats.comments || 0) + 1,
            updatedAt: serverTimestamp()
          });
        }
      });

      setNewComment('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      alert('Có lỗi xảy ra khi thêm bình luận.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId, commentData) => {
    if (!user) {
      openLoginPrompt();
      return;
    }

    const isOwner = commentData.userId === user.uid;
    const canDelete = isOwner || userIsAdmin;

    if (!canDelete) {
      setModalTitle('Không có quyền');
      setModalContent(<p>Bạn không có quyền xóa bình luận này.</p>);
      setModalTone('error');
      setModalActions(
        <button
          onClick={() => setModalOpen(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Đóng
        </button>
      );
      setModalOpen(true);
      return;
    }

    // Confirm deletion
    setModalTitle('Xác nhận xóa');
    setModalContent(
      <p>
        Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể
        hoàn tác.
      </p>
    );
    setModalTone('warning');
    setModalActions(
      <>
        <button
          onClick={() => setModalOpen(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
        >
          Hủy
        </button>
        <button
          onClick={async () => {
            try {
              await deleteComment(commentId, postId, commentData);
              setModalOpen(false);
            } catch (error) {
              console.error('Error deleting comment:', error);
              alert('Có lỗi xảy ra khi xóa bình luận.');
            }
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          Xóa
        </button>
      </>
    );
    setModalOpen(true);
  };

  const handleLikeComment = async (commentId, commentData) => {
    if (!user) {
      openLoginPrompt();
      return;
    }

    if (!user.emailVerified) {
      openVerifyPrompt();
      return;
    }

    try {
      const commentRef = doc(db, 'posts', postId, 'comments', commentId);
      const isLiked = commentData.likedBy?.includes(user.uid);

      if (isLiked) {
        // Unlike
        await updateDoc(commentRef, {
          likesCount: Math.max(0, (commentData.likesCount || 0) - 1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        // Like
        await updateDoc(commentRef, {
          likesCount: (commentData.likesCount || 0) + 1,
          likedBy: arrayUnion(user.uid)
        });

        // Send notification if not liking own comment
        if (commentData.userId !== user.uid) {
          await upsertLikeNotification({
            toUserId: commentData.userId,
            postId,
            commentId,
            fromUser: user
          });
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      alert('Có lỗi xảy ra khi thích bình luận.');
    }
  };

  const autoResizeTextarea = (textarea) => {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  };

  const handleTextareaInput = (e) => {
    setNewComment(e.target.value);
    autoResizeTextarea(e.target);
  };

  return (
    <div className="mt-8 space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-xl font-semibold text-gray-900">
          Bình luận ({comments.length})
        </h3>
      </div>

      {/* Comment form */}
      <form onSubmit={handleSubmitComment} className="space-y-4">
        <div className="flex gap-3">
          <UserAvatar
            userName={preferredName(user)}
            userPhoto={preferredPhoto(user)}
            size="md"
          />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleTextareaInput}
              placeholder="Viết bình luận của bạn..."
              className="w-full resize-none rounded-lg border border-gray-300 p-3 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              rows={3}
              disabled={loading}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading || !newComment.trim()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <FontAwesomeIcon icon={faPaperPlane} />
            )}
            Gửi bình luận
          </button>
        </div>
      </form>

      {/* Comments list */}
      <div className="space-y-6">
        {comments.map((comment) => {
          const dateFormatted = formatDate(comment.createdAt);
          const isOwner = user && comment.userId === user.uid;
          const canDelete = isOwner || userIsAdmin;
          const isLiked = comment.likedBy?.includes(user?.uid);

          return (
            <div key={comment.id} className="flex gap-3">
              <UserAvatar
                userName={comment.userName}
                userPhoto={comment.userPhoto}
                size="md"
              />

              <div className="flex-1 space-y-2">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {comment.userName}
                      </span>
                      {dateFormatted && (
                        <span
                          className="text-sm text-gray-500"
                          title={dateFormatted.abs}
                        >
                          {dateFormatted.rel}
                        </span>
                      )}
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(comment.id, comment)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-600"
                        title={isOwner ? 'Xóa bình luận' : 'Xóa bình luận (Admin)'}
                      >
                        <FontAwesomeIcon icon={faTrash} className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-gray-800 whitespace-pre-wrap">
                    {comment.content}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={() => handleLikeComment(comment.id, comment)}
                    className={`flex items-center gap-1 text-sm transition-colors ${
                      isLiked
                        ? 'text-red-600 hover:text-red-700'
                        : 'text-gray-500 hover:text-red-600'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={faHeart}
                      className={isLiked ? 'text-red-600' : ''}
                    />
                    {comment.likesCount > 0 && (
                      <span>{comment.likesCount}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {hasMore && (
          <div className="text-center">
            <button
              onClick={loadMoreComments}
              disabled={loadingMore}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
                  Đang tải...
                </div>
              ) : (
                'Tải thêm bình luận'
              )}
            </button>
          </div>
        )}

        {comments.length === 0 && (
          <div className="py-12 text-center">
            <FontAwesomeIcon
              icon={faQuoteLeft}
              className="mx-auto mb-4 h-12 w-12 text-gray-300"
            />
            <p className="text-gray-500">
              Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <CenterModal
        open={modalOpen}
        title={modalTitle}
        onClose={() => setModalOpen(false)}
        actions={modalActions}
        tone={modalTone}
      >
        {modalContent}
      </CenterModal>
    </div>
  );
}
