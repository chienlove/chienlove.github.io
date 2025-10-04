// lib/firebase-admin.js
import * as admin from 'firebase-admin';

/**
 * Robust loader:
 * - Chấp nhận 1 trong 2 biến:
 *   FIREBASE_SERVICE_ACCOUNT_JSON          (JSON thuần)
 *   FIREBASE_SERVICE_ACCOUNT_JSON_BASE64   (JSON đã encode base64)
 * - Tự phát hiện & parse đúng định dạng
 * - Sửa private_key: chuyển "\\n" -> "\n", thêm newline quanh header/footer nếu bị dính
 */
function loadServiceAccount() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const rawB64  = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;

  if (!rawJson && !rawB64) {
    throw new Error(
      'Missing service account env. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_JSON_BASE64'
    );
  }

  let text;
  if (rawJson && rawJson.trim().startsWith('{')) {
    // Bạn đã dán JSON thuần vào env
    text = rawJson.trim();
  } else {
    // Bạn cung cấp base64 (khuyến nghị trên Vercel)
    const b64 = (rawB64 || rawJson || '').trim().replace(/^"|"$/g, '');
    try {
      text = Buffer.from(b64, 'base64').toString('utf8');
    } catch {
      throw new Error('Service account base64 decode failed. Check your BASE64 value.');
    }
  }

  // Một số người dán thêm ngoặc kép ngoài cùng -> bỏ
  text = text.replace(/^\s*"+\s*|\s*"+\s*$/g, '');

  let creds;
  try {
    creds = JSON.parse(text);
  } catch {
    // Thử phương án: có thể text vẫn là JSON hợp lệ nhưng bị escape 2 lần
    try {
      creds = JSON.parse(JSON.parse(text));
    } catch {
      throw new Error('Service account JSON parse failed. Ensure it is valid JSON or valid Base64 of JSON.');
    }
  }

  // Sửa private_key: chuyển "\\n" -> "\n"
  if (typeof creds.private_key === 'string') {
    // Chuẩn hoá xuống dòng Windows -> Unix
    creds.private_key = creds.private_key.replace(/\r\n/g, '\n');
    // Chuẩn hoá escape -> newline thật
    if (creds.private_key.includes('\\n')) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    // Đảm bảo header/footer có newline đúng
    if (/-----BEGIN PRIVATE KEY-----\S/.test(creds.private_key)) {
      creds.private_key = creds.private_key.replace(
        /-----BEGIN PRIVATE KEY-----\s*/,
        '-----BEGIN PRIVATE KEY-----\n'
      );
    }
    if (/\S-----END PRIVATE KEY-----/.test(creds.private_key)) {
      creds.private_key = creds.private_key.replace(
        /\s*-----END PRIVATE KEY-----/,
        '\n-----END PRIVATE KEY-----\n'
      );
    }
  }

  return creds;
}

if (!admin.apps.length) {
  const credentials = loadServiceAccount();

  // Một số trường quan trọng phải có
  const must = ['project_id', 'client_email', 'private_key'];
  for (const k of must) {
    if (!credentials[k] || typeof credentials[k] !== 'string') {
      throw new Error(`Service account is missing required field: ${k}`);
    }
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    // Ép projectId nếu muốn rõ ràng (thường không cần vì lấy từ credentials.project_id)
    projectId: credentials.project_id,
  });
}

const dbAdmin = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export { admin, dbAdmin, FieldValue };