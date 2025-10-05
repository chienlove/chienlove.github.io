// pages/api/admin/ban-user.js
import { admin, dbAdmin, FieldValue } from '../../../lib/firebase-admin';
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
    if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing token' });

    const decoded = await admin.auth().verifyIdToken(idToken);
    if (!(decoded?.uid && await isAdmin(decoded.uid))) {
      return res.status(403).json({ ok: false, error: 'Forbidden' });
    }

    const { uid, action, reason, mode, durationMinutes, expiresAtISO } = (req.body || {});
    const targetUid = String(uid || '').trim();
    const act = String(action || '').trim(); // 'ban' | 'unban'
    if (!targetUid || !act) return res.status(400).json({ ok: false, error: 'Missing uid/action' });

    const user = await admin.auth().getUser(targetUid).catch(() => null);
    const email = user?.email || '';
    if (!email) return res.status(400).json({ ok: false, error: 'User has no email' });

    const hash = emailHash(email);
    const col = dbAdmin.collection('banned_emails');

    if (act === 'ban') {
      // Tính expiresAt nếu mode = temporary
      let expiresAt = null;
      const m = (mode || '').toLowerCase();
      if (m === 'temporary') {
        if (Number.isFinite(durationMinutes)) {
          expiresAt = new Date(Date.now() + Math.max(1, Number(durationMinutes)) * 60 * 1000);
        } else if (expiresAtISO) {
          const t = new Date(expiresAtISO);
          if (!isNaN(t.getTime())) expiresAt = t;
        }
        if (!expiresAt) return res.status(400).json({ ok: false, error: 'Missing/invalid duration or expiresAt' });
      }

      const payload = {
        uid: targetUid,
        emailLower: String(email).trim().toLowerCase(),
        reason: reason || (m === 'temporary' ? 'temp_ban' : 'perm_ban'),
        by: decoded.uid,
        createdAt: FieldValue.serverTimestamp(),
      };
      if (expiresAt) {
        payload.expiresAt = admin.firestore.Timestamp.fromDate(expiresAt);
      }

      await col.doc(hash).set(payload, { merge: true });

      // Disable tài khoản và revoke token để đá ra ngay
      try { await admin.auth().updateUser(targetUid, { disabled: true }); } catch {}
      try { await admin.auth().revokeRefreshTokens(targetUid); } catch {}

      return res.status(200).json({
        ok: true,
        banned: true,
        mode: expiresAt ? 'temporary' : 'permanent',
        email,
        hash,
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
      });
    }

    if (act === 'unban') {
      await col.doc(hash).delete().catch(() => {});
      try { await admin.auth().updateUser(targetUid, { disabled: false }); } catch {}
      return res.status(200).json({ ok: true, banned: false, email, hash });
    }

    return res.status(400).json({ ok: false, error: 'Invalid action' });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'server error' });
  }
}