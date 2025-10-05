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

    // 1) Lấy Bearer token
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing Authorization token' });

    // 2) Xác thực token
    const decoded = await admin.auth().verifyIdToken(idToken, true /*checkRevoked*/).catch(() => null);
    if (!decoded?.uid) return res.status(401).json({ ok: false, error: 'Invalid token' });

    // 3) Lấy user để biết email
    const authUser = await admin.auth().getUser(decoded.uid).catch(() => null);
    if (!authUser?.email) {
      // Ẩn danh/không có email -> cho qua
      return res.status(200).json({ ok: true, allowed: true });
    }

    const emailLower = String(authUser.email).trim().toLowerCase();
    const hash = emailHash(emailLower);

    // 4) Ưu tiên tra doc theo hash
    let banDoc = await dbAdmin.collection('banned_emails').doc(hash).get();

    // 5) Fallback: nếu không có theo id hash -> query theo emailLower
    if (!banDoc.exists) {
      const q = await dbAdmin.collection('banned_emails')
        .where('emailLower', '==', emailLower).limit(1).get();
      if (!q.empty) banDoc = q.docs[0];
    }

    // Không có trong danh sách ban ⇒ ok
    if (!banDoc.exists) {
      return res.status(200).json({ ok: true, allowed: true });
    }

    // Có bản ghi ban ⇒ kiểm tra hạn
    const data = banDoc.data() || {};
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : null;
    const now = Date.now();

    if (expiresAt && expiresAt <= now) {
      // Hết hạn ban -> auto-unban
      try { await dbAdmin.collection('banned_emails').doc(banDoc.id).delete(); } catch {}
      return res.status(200).json({ ok: true, allowed: true });
    }

    // Còn hiệu lực ⇒ trả thông tin chi tiết để frontend hiển thị
    return res.status(403).json({
      ok: false,
      mode: expiresAt ? 'temporary' : 'permanent',
      reason: data.reason || null,
      expiresAt: expiresAt || null, // millis
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'Internal error' });
  }
}