import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  storageBucket: "your-bucket.appspot.com"
};

const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

// Upload ảnh và trả về URL
export async function uploadImage(file: File) {
  const storageRef = ref(storage, `icons/${file.name}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}