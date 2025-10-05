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

    // Lấy Bearer token
    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing Authorization token' });

    // Xác thực token
    const decoded = await admin.auth().verifyIdToken(idToken, true /* checkRevoked */).catch(() => null);
    if (!decoded?.uid) return res.status(401).json({ ok: false, error: 'Invalid token' });

    // Lấy thông tin auth user (để biết email & disabled)
    const authUser = await admin.auth().getUser(decoded.uid).catch(() => null);
    if (!authUser?.email) {
      // Không có email (ẩn danh / provider không cung cấp email) → cho qua
      return res.status(200).json({ ok: true, allowed: true });
    }

    const emailLower = String(authUser.email).trim().toLowerCase();
    const hash = emailHash(emailLower);
    const ref = dbAdmin.collection('banned_emails').doc(hash);
    const doc = await ref.get();

    // Không có trong danh sách ban => ok
    if (!doc.exists) {
      // Tuỳ policy, có thể enable lại nếu đang disabled mà không còn ban
      // try { if (authUser.disabled) await admin.auth().updateUser(decoded.uid, { disabled: false }); } catch {}
      return res.status(200).json({ ok: true, allowed: true });
    }

    // Có bản ghi ban => kiểm tra hạn
    const data = doc.data() || {};
    const expiresAt = data.expiresAt?.toMillis ? data.expiresAt.toMillis() : null;
    const now = Date.now();

    if (expiresAt && expiresAt <= now) {
      // Hết hạn ban → auto-unban
      try { await ref.delete(); } catch {}
      try { await admin.auth().updateUser(decoded.uid, { disabled: false }); } catch {}
      return res.status(200).json({ ok: true, allowed: true, unbanned: true });
    }

    // Vẫn đang bị ban → đảm bảo disabled + revoke để đá user
    try { if (!authUser.disabled) await admin.auth().updateUser(decoded.uid, { disabled: true }); } catch {}
    try { await admin.auth().revokeRefreshTokens(decoded.uid); } catch {}

    const mode = expiresAt ? 'temporary' : 'permanent';
    return res.status(403).json({
      ok: false,
      banned: true,
      mode,
      reason: data.reason || null,
      expiresAt: expiresAt || null
    });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message || 'server error' });
  }
}