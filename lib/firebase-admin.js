// lib/firebase-admin.js
import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const jsonBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_BASE64;
  if (!jsonBase64) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON_BASE64 env var');
  }
  const credentials = JSON.parse(
    Buffer.from(jsonBase64, 'base64').toString('utf8')
  );

  // Một số môi trường Base64 private_key bị chuyển \n thành \\n → chuẩn hoá lại:
  if (credentials.private_key?.includes('\\n')) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    // projectId sẽ lấy từ credentials.project_id; nếu muốn ép:
    // projectId: credentials.project_id,
  });
}

const dbAdmin = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export { admin, dbAdmin, FieldValue };