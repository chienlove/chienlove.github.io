// lib/firebase-admin.js
import * as admin from 'firebase-admin';

function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawB64  = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!rawJson && !rawB64) {
    throw new Error('Missing service account env. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64');
  }

  let text;
  if (rawJson && rawJson.trim().startsWith('{')) {
    text = rawJson.trim();
  } else {
    const b64 = (rawB64 || rawJson || '').trim().replace(/^"|"$/g, '');
    try { text = Buffer.from(b64, 'base64').toString('utf8'); }
    catch { throw new Error('Service account base64 decode failed.'); }
  }

  // bóc ngoặc kép bao ngoài nếu có
  text = text.replace(/^\s*"+\s*|\s*"+\s*$/g, '');

  let creds;
  try { creds = JSON.parse(text); }
  catch {
    try { creds = JSON.parse(JSON.parse(text)); }
    catch { throw new Error('Service account JSON parse failed.'); }
  }

  // Chuẩn hoá private_key
  if (typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\r\n/g, '\n');
    if (creds.private_key.includes('\\n')) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    if (/-----BEGIN PRIVATE KEY-----\S/.test(creds.private_key)) {
      creds.private_key = creds.private_key.replace(/-----BEGIN PRIVATE KEY-----\s*/, '-----BEGIN PRIVATE KEY-----\n');
    }
    if (/\S-----END PRIVATE KEY-----/.test(creds.private_key)) {
      creds.private_key = creds.private_key.replace(/\s*-----END PRIVATE KEY-----/, '\n-----END PRIVATE KEY-----\n');
    }
  }

  return creds;
}

if (!admin.apps.length) {
  const credentials = loadServiceAccount();

  // LOG CHUẨN ĐOÁN: chỉ in ra phần vô hại
  try {
    console.log('[admin-sdk] project_id =', credentials.project_id);
    console.log('[admin-sdk] client_email domain =', String(credentials.client_email || '').split('@')[1] || '(none)');
    console.log('[admin-sdk] private_key length =', typeof credentials.private_key === 'string' ? credentials.private_key.length : '(not string)');
  } catch {}

  const must = ['project_id', 'client_email', 'private_key'];
  for (const k of must) {
    if (!credentials[k] || typeof credentials[k] !== 'string') {
      throw new Error(`Service account is missing required field: ${k}`);
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: credentials.project_id,
  });
}

const dbAdmin = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export { admin, dbAdmin, FieldValue };