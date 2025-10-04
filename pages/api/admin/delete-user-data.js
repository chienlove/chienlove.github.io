// pages/api/admin/delete-user-data.js
import { admin, dbAdmin, FieldValue } from '../../../lib/firebase-admin';

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function isAdmin(uid) {
  const snap = await dbAdmin.collection('app_config').doc('admins').get();
  const uids = Array.isArray(snap.data()?.uids) ? snap.data().uids : [];
  return uids.includes(uid);
}

async function deleteByQuery(col, field, op, value, limitSize = 400) {
  let last = null, total = 0;
  for (;;) {
    let q = dbAdmin.collection(col).where(field, op, value).limit(limitSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;

    const batch = dbAdmin.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();

    total += snap.size;
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < limitSize) break;
  }
  return total;
}

async function updateLikesRemoveUser(uid, limitSize = 300) {
  let last = null, total = 0;
  for (;;) {
    let q = dbAdmin.collection('comments')
      .where('likedBy', 'array-contains', uid)
      .limit(limitSize);
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = dbAdmin.batch();
    snap.docs.forEach(d => {
      batch.update(d.ref, {
        likedBy: FieldValue.arrayRemove(uid),
        likeCount: FieldValue.increment(-1),
      });
    });
    await batch.commit();

    total += snap.size;
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < limitSize) break;
  }
  return total;
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Lấy ID token từ header
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: 'Missing Authorization Bearer <ID_TOKEN>' });

    // Xác thực & kiểm tra quyền admin
    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded?.uid) return res.status(401).json({ error: 'Invalid token' });
    if (!(await isAdmin(decoded.uid))) return res.status(403).json({ error: 'Not an admin' });

    const targetUid = String(req.query.uid || req.body?.uid || '').trim();
    if (!targetUid) return res.status(400).json({ error: 'Missing uid' });

    // 1) Gắn cờ deleted vào users/{uid}
    const userRef = dbAdmin.collection('users').doc(targetUid);
    await userRef.set({
      status: 'deleted',
      displayName: 'Đã xoá',
      photoURL: '',
      bio: '',
      socialLinks: {},
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2) Xoá dữ liệu liên quan
    const commentsDeleted   = await deleteByQuery('comments',       'authorId', '==', targetUid);
    const likesRemoved      = await updateLikesRemoveUser(targetUid);
    const notifToDeleted    = await deleteByQuery('notifications',  'toUserId', '==', targetUid);
    const notifFromDeleted  = await deleteByQuery('notifications',  'fromUserId','==', targetUid);

    // 3) Xoá counter (nếu có)
    await dbAdmin.collection('user_counters').doc(targetUid).delete().catch(() => {});

    // (Tuỳ chọn) Xoá hẳn users/{uid} sau cùng:
    // await userRef.delete();

    return res.json({
      ok: true,
      stats: {
        commentsDeleted,
        likesRemoved,
        notificationsDeleted: notifToDeleted + notifFromDeleted,
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || 'Server error' });
  }
}