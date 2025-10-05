// pages/api/auth/ban-info.js
import crypto from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdminApp } from '../../../lib/firebase-admin'; // dùng cùng lib admin

const emailHash = (email) =>
  crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ banned: false });

  try {
    initAdminApp();
    const db = getFirestore();
    const adminAuth = getAuth();

    // 1) ƯU TIÊN: kiểm tra trong banned_emails (đúng với guard.js)
    const hash = emailHash(email);
    const banDoc = await db.collection('banned_emails').doc(hash).get();
    if (banDoc.exists) {
      const data = banDoc.data() || {};
      const expiresAt =
        data.expiresAt instanceof Timestamp
          ? data.expiresAt.toDate().toISOString()
          : data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : null;

      return res.status(200).json({
        banned: true,
        mode: expiresAt ? 'temporary' : 'permanent',
        reason: data.reason || null,
        expiresAt, // ISO string hoặc null
      });
    }

    // 2) FALLBACK: kiểm tra users/{uid}.ban nếu bạn vẫn lưu thêm ở đây
    let uid = null;
    try {
      const u = await adminAuth.getUserByEmail(email);
      uid = u.uid;
    } catch {
      /* không có trong Auth -> bỏ qua */
    }

    let userDoc = null;
    if (uid) {
      const snap = await db.collection('users').doc(uid).get();
      userDoc = snap.exists ? { id: snap.id, ...snap.data() } : null;
    }
    if (!userDoc) {
      const q = await db.collection('users').where('email', '==', email).limit(1).get();
      if (!q.empty) userDoc = { id: q.docs[0].id, ...q.docs[0].data() };
    }

    if (userDoc?.ban) {
      const ban = userDoc.ban;
      const hasBan = !!(ban.active || ban.isBanned || ban.until || ban.mode);
      if (hasBan) {
        const mode = ban.mode || (ban.until ? 'temporary' : 'permanent');
        const expiresAt = ban.until
          ? (ban.until.toDate ? ban.until.toDate().toISOString() : new Date(ban.until).toISOString())
          : null;
        return res.status(200).json({
          banned: true,
          mode,
          reason: ban.reason || null,
          expiresAt,
        });
      }
    }

    // Không thấy BAN ở đâu cả
    return res.status(200).json({ banned: false });
  } catch {
    // an toàn: không lộ lỗi bên ngoài
    return res.status(200).json({ banned: false });
  }
}