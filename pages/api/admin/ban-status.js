// pages/api/admin/ban-status.js
import { admin, dbAdmin } from '../../../lib/firebase-admin';
import crypto from 'crypto';

async function isAdmin(uid) {
  try {
    const snap = await dbAdmin.collection('app_config').doc('admins').get();
    const uids = Array.isArray(snap.data()?.uids) ? snap.data().uids : [];
    return uids.includes(uid);
  } catch {
    return false;
  }
}
const emailHash = (email) =>
  crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!(decoded?.uid && await isAdmin(decoded.uid))) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const targetUid = String(req.query.uid || '').trim();
    if (!targetUid) return res.status(400).json({ ok: false, error: 'Missing uid' });

    let email = '';
    try {
      const u = await admin.auth().getUser(targetUid);
      email = u.email || '';
    } catch {}
    if (!email) return res.status(200).json({ ok: true, banned: false, reason: null, mode: null });

    const hash = emailHash(email);
    const ref = dbAdmin.collection('banned_emails').doc(hash);
    const doc = await ref.get();

    // Nếu đã có bản ghi ban
    if (doc.exists) {
      const data = doc.data() || {};
      const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : null;
      const now = Date.now();

      // Hết hạn? -> auto-unban (xóa doc + enable auth)
      if (expiresAt && expiresAt <= now) {
        await ref.delete().catch(()=>{});
        try { await admin.auth().updateUser(targetUid, { disabled: false }); } catch {}
        return res.status(200).json({ ok: true, banned: false, reason: null, mode: null });
      }

      const authUser = await admin.auth().getUser(targetUid).catch(() => null);
      return res.status(200).json({
        ok: true,
        banned: true,
        reason: data.reason || null,
        mode: expiresAt ? 'temporary' : 'permanent',
        expiresAt: expiresAt || null,
        remainingMs: expiresAt ? Math.max(0, expiresAt - now) : null,
        authDisabled: Boolean(authUser?.disabled),
        email,
      });
    }

    return res.status(200).json({ ok: true, banned: false, reason: null, mode: null });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'server error' });
  }
}