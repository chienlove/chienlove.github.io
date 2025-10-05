import crypto from 'crypto';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initAdminApp } from '../../../lib/firebase-admin';

const h = (s) =>
  crypto.createHash('sha256').update(String(s || '').trim().toLowerCase()).digest('hex');
const normEmail = (s) => String(s || '').trim().toLowerCase();

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = normEmail(req.query.email || '');
  if (!email) return res.status(400).json({ banned: false });

  try {
    initAdminApp();
    const db = getFirestore();
    const col = db.collection('banned_emails');

    const emailHash = h(email);
    let found = null;

    // 1. Tra docId = hash(email)
    const byId = await col.doc(emailHash).get();
    if (byId.exists) found = byId;

    // 2. Fallback: where emailLower == email
    if (!found) {
      const q = await col.where('emailLower', '==', email).limit(1).get();
      if (!q.empty) found = q.docs[0];
    }

    // 3. Optional fallback: where email == email
    if (!found) {
      const q2 = await col.where('email', '==', email).limit(1).get();
      if (!q2.empty) found = q2.docs[0];
    }

    if (!found) return res.status(200).json({ banned: false });

    const data = found.data() || {};
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
      expiresAt: expiresAtISO,
    });
  } catch {
    return res.status(200).json({ banned: false });
  }
}