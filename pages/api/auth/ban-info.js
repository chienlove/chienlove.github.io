// pages/api/auth/ban-info.js
import crypto from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initAdminApp } from '../../../lib/firebase-admin';

const emailHash = (email) =>
  crypto.createHash('sha256').update(String(email || '').trim().toLowerCase()).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ banned: false });

  try {
    initAdminApp();
    const db = getFirestore();

    const hash = emailHash(email);

    // 1) Thử doc theo hash
    let banDoc = await db.collection('banned_emails').doc(hash).get();

    // 2) Fallback: query theo emailLower nếu doc(hash) không tồn tại
    if (!banDoc.exists) {
      const q = await db.collection('banned_emails').where('emailLower', '==', email).limit(1).get();
      if (!q.empty) banDoc = q.docs[0];
    }

    if (banDoc.exists) {
      const data = banDoc.data() || {};
      const expiresAtISO =
        data.expiresAt instanceof Timestamp
          ? data.expiresAt.toDate().toISOString()
          : data.expiresAt
          ? new Date(data.expiresAt).toISOString()
          : null;

      return res.status(200).json({
        banned: true,
        mode: expiresAtISO ? 'temporary' : 'permanent',
        reason: data.reason || null,
        expiresAt: expiresAtISO, // ISO string hoặc null
      });
    }

    // Không có ban
    return res.status(200).json({ banned: false });
  } catch (e) {
    return res.status(200).json({ banned: false }); // đừng lộ lỗi thật ra ngoài
  }
}