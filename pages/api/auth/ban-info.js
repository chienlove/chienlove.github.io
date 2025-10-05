// pages/api/auth/ban-info.js
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initAdminApp } from '../../../lib/firebase-admin'; // <- hàm init admin bạn đang dùng

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = String(req.query.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ banned: false });

  try {
    initAdminApp();
    const adminAuth = getAuth();
    const db = getFirestore();

    // tra cứu uid theo email (nếu có)
    let uid = null;
    try {
      const u = await adminAuth.getUserByEmail(email);
      uid = u.uid;
    } catch {
      // nếu không có trong Auth thì vẫn thử tìm theo users.email
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

    if (!userDoc) return res.status(200).json({ banned: false });

    const ban = userDoc.ban || {};
    const banned = !!(ban.active || ban.isBanned || ban.until || ban.mode);
    if (!banned) return res.status(200).json({ banned: false });

    // chuẩn hoá dữ liệu
    const mode = ban.mode || (ban.until ? 'temporary' : 'permanent');
    const reason = ban.reason || null;
    const expiresAt = ban.until ? (ban.until.toDate ? ban.until.toDate().toISOString() : new Date(ban.until).toISOString()) : null;

    return res.status(200).json({ banned: true, mode, reason, expiresAt });
  } catch (e) {
    return res.status(200).json({ banned: false });
  }
}