// pages/api/auth/guard.js
import { admin, dbAdmin } from '../../../lib/firebase-admin';
import crypto from 'crypto';

const emailHash = (email) =>
  crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing Authorization token' });

    const decoded = await admin.auth().verifyIdToken(idToken, true).catch(() => null);
    if (!decoded?.uid) return res.status(401).json({ ok: false, error: 'Invalid token' });

    const authUser = await admin.auth().getUser(decoded.uid).catch(() => null);
    if (!authUser?.email) return res.status(200).json({ ok: true, allowed: true });

    const emailLower = String(authUser.email).trim().toLowerCase();
    const hash = emailHash(emailLower);

    // Ưu tiên doc theo hash
    let banDoc = await dbAdmin.collection('banned_emails').doc(hash).get();

    // Fallback: query theo emailLower
    if (!banDoc.exists) {
      const q = await dbAdmin.collection('banned_emails')
        .where('emailLower', '==', emailLower).limit(1).get();
      if (!q.empty) banDoc = q.docs[0];
    }

    if (!banDoc.exists) {
      return res.status(200).json({ ok: true, allowed: true });
    }

    const data = banDoc.data() || {};
    const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : null;

    // Hết hạn -> tự gỡ ban
    if (expiresAtMs && expiresAtMs <= Date.now()) {
      try { await dbAdmin.collection('banned_emails').doc(banDoc.id).delete(); } catch {}
      return res.status(200).json({ ok: true, allowed: true, unbanned: true });
    }

    // Còn hiệu lực => trả chi tiết để frontend hiển thị
    return res.status(403).json({
      ok: false,
      mode: expiresAtMs ? 'temporary' : 'permanent',
      reason: data.reason || null,
      // trả ISO để frontend không phải đoán kiểu dữ liệu
      expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'server error' });
  }
}