// pages/api/auth/ban-info.js
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { admin, dbAdmin } from '../../../lib/firebase-admin';

// Chuẩn hoá email: hạ chữ, trim, loại bỏ ký tự zero-width (nếu có)
const stripZW = (s) => String(s || '').replace(/[\u200B-\u200D\uFEFF]/g, '');
const normEmail = (s) => stripZW(String(s || '').trim().toLowerCase());
const hash = (s) => crypto.createHash('sha256').update(normEmail(s)).digest('hex');

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = normEmail(req.query.email || '');
  const debug = String(req.query.debug || '') === '1';
  if (!email) return res.status(400).json({ banned: false, error: 'missing email' });

  try {
    // dbAdmin là instance Firestore admin đã khởi tạo sẵn (theo cùng kiểu với guard.js)
    const col = dbAdmin.collection('banned_emails');

    let found = null;
    let foundBy = null;

    // 1) Tra theo docId = sha256(email)
    const byId = await col.doc(hash(email)).get();
    if (byId.exists) { found = byId; foundBy = 'docId(hash)'; }

    // 2) Fallback: where emailLower == email
    if (!found) {
      const q1 = await col.where('emailLower', '==', email).limit(1).get();
      if (!q1.empty) { found = q1.docs[0]; foundBy = 'emailLower=='; }
    }

    // 3) Fallback: where email == email (nếu lỡ dùng field 'email')
    if (!found) {
      const q2 = await col.where('email', '==', email).limit(1).get();
      if (!q2.empty) { found = q2.docs[0]; foundBy = 'email=='; }
    }

    // 4) Range query để bắt case "ký tự vô hình"/khác biệt nhẹ
    if (!found) {
      const end = email + '\uf8ff';
      const q3 = await col.where('emailLower', '>=', email).where('emailLower', '<=', end).limit(1).get();
      if (!q3.empty) { found = q3.docs[0]; foundBy = 'emailLower range'; }
    }

    if (!found) {
      return res.status(200).json({
        banned: false,
        ...(debug ? { debug: { normalizedEmail: email, tried: ['docId(hash)','emailLower==','email==','emailLower range'] } } : {})
      });
    }

    const data = found.data() || {};
    const expiresAtISO =
      data.expiresAt instanceof Timestamp
        ? data.expiresAt.toDate().toISOString()
        : (data.expiresAt ? new Date(data.expiresAt).toISOString() : null);

    const payload = {
      banned: true,
      mode: expiresAtISO ? 'temporary' : 'permanent',
      reason: data.reason || null,
      expiresAt: expiresAtISO,
    };
    if (debug) payload.debug = { foundBy, docId: found.id, fields: Object.keys(data), emailLowerField: data.emailLower || null };

    return res.status(200).json(payload);
  } catch (e) {
    // Không lộ lỗi nội bộ ra ngoài
    return res.status(200).json({ banned: false, ...(debug ? { error: e?.message } : {}) });
  }
}