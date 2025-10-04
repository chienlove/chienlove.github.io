// lib/firebase-admin.js
import * as admin from 'firebase-admin';

// Khởi tạo chỉ 1 lần duy nhất
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    // Nếu bạn dùng service account JSON, thay dòng trên bằng:
    // credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
  });
}

// Xuất các thành phần cần thiết
const dbAdmin = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

export { admin, dbAdmin, FieldValue };