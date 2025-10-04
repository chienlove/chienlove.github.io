// pages/api/admin/delete-user-data.js
import { admin, dbAdmin, FieldValue } from '../../../lib/firebase-admin';

// ── helpers ───────────────────────────────────────────────────────────
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

// ── handler ───────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // Xác thực admin
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ error: 'Missing Authorization Bearer <ID_TOKEN>' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!decoded?.uid) return res.status(401).json({ error: 'Invalid token' });
    if (!(await isAdmin(decoded.uid))) return res.status(403).json({ error: 'Not an admin' });

    // Tham số
    const targetUid = String(req.query.uid || req.body?.uid || '').trim();
    const hard = (String(req.query.hard || req.body?.hard || '').toLowerCase() === 'true') ||
                 (String(req.query.hard || req.body?.hard || '') === '1');
    const deleteAuth = (String(req.query.deleteAuth || req.body?.deleteAuth || '').toLowerCase() === 'true') ||
                       (String(req.query.deleteAuth || req.body?.deleteAuth || '') === '1');

    if (!targetUid) return res.status(400).json({ error: 'Missing uid' });

    // 1) Soft tombstone (đảm bảo chặn ngay lập tức)
    const userRef = dbAdmin.collection('users').doc(targetUid);
    await userRef.set({
      status: 'deleted',
      displayName: 'Đã xoá',
      photoURL: '',
      bio: '',
      socialLinks: {},
      email: '', // nếu bạn đang lưu email trong user doc
      deletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    // 2) Dọn dữ liệu liên quan
    const commentsDeleted   = await deleteByQuery('comments',      'authorId',  '==', targetUid);
    const likesRemoved      = await updateLikesRemoveUser(targetUid);
    const notifToDeleted    = await deleteByQuery('notifications', 'toUserId',  '==', targetUid);
    const notifFromDeleted  = await deleteByQuery('notifications', 'fromUserId','==', targetUid);

    // 3) Xoá counter (nếu có)
    await dbAdmin.collection('user_counters').doc(targetUid).delete().catch(() => {});

    // (Tuỳ chọn) 4) Xoá auth user nếu còn trong Authentication
    let authDeleted = false;
    if (deleteAuth) {
      try {
        await admin.auth().deleteUser(targetUid);
        authDeleted = true;
      } catch (e) {
        // nếu user auth đã bị xoá trước đó sẽ ném lỗi; bỏ qua
      }
    }

    // (Tuỳ chọn) 5) Hard delete user doc
    let userDocDeleted = false;
    if (hard) {
      await userRef.delete().then(() => { userDocDeleted = true; });
    }

    return res.json({
      ok: true,
      mode: hard ? 'hard' : 'soft',
      authDeleted,
      userDocDeleted,
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