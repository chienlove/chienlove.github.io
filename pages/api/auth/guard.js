// pages/api/auth/guard.js
import { admin, dbAdmin } from '../../../lib/firebase-admin';
import crypto from 'crypto';

const stripZW = (s) => String(s || '').replace(/[\u200B-\u200D\uFEFF]/g, '');
const normEmail = (s) => stripZW(String(s || '').trim().toLowerCase());
const hash = (s) => crypto.createHash('sha256').update(normEmail(s)).digest('hex');

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }
    const debug = String(req.query.debug || '') === '1';

    const idToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!idToken) return res.status(401).json({ ok: false, error: 'Missing Authorization token' });

    const decoded = await admin.auth().verifyIdToken(idToken, true).catch(() => null);
    if (!decoded?.uid) return res.status(401).json({ ok: false, error: 'Invalid token' });

    const authUser = await admin.auth().getUser(decoded.uid).catch(() => null);
    if (!authUser?.email) return res.status(200).json({ ok: true, allowed: true });

    const email = normEmail(authUser.email);

    const col = dbAdmin.collection('banned_emails');
    let found = await col.doc(hash(email)).get();
    let foundBy = found.exists ? 'docId(hash)' : null;

    if (!found.exists) {
      const q1 = await col.where('emailLower', '==', email).limit(1).get();
      if (!q1.empty) { found = q1.docs[0]; foundBy = 'emailLower=='; }
    }

    if (!found.exists) {
      const q2 = await col.where('email', '==', email).limit(1).get();
      if (!q2.empty) { found = q2.docs[0]; foundBy = 'email=='; }
    }

    if (!found.exists) {
      // range cuối cùng
      const end = email + '\uf8ff';
      const q3 = await col.where('emailLower', '>=', email).where('emailLower', '<=', end).limit(1).get();
      if (!q3.empty) { found = q3.docs[0]; foundBy = 'emailLower range'; }
    }

    if (!found.exists) {
      return res.status(200).json({ ok: true, allowed: true, ...(debug ? { debug: { email, tried: ['docId(hash)','emailLower==','email==','emailLower range'] } } : {}) });
    }

    const data = found.data() || {};
    const expiresAtMs = data.expiresAt?.toMillis ? data.expiresAt.toMillis()
                      : (data.expiresAt ? new Date(data.expiresAt).getTime() : null);

    if (expiresAtMs && expiresAtMs <= Date.now()) {
      try { await col.doc(found.id).delete(); } catch {}
      return res.status(200).json({ ok: true, allowed: true, unbanned: true });
    }

    const payload = {
      ok: false,
      mode: expiresAtMs ? 'temporary' : 'permanent',
      reason: data.reason || null,
      expiresAt: expiresAtMs ? new Date(expiresAtMs).toISOString() : null,
    };
    if (debug) payload.debug = { email, foundBy, docId: found.id };

    return res.status(403).json(payload);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || 'server error' });
  }
}