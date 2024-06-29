// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database"; // Import database module

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyABo1KBDlLJdeNIP5diteT2J0MMemgLigo",
  authDomain: "admin-panel-7418d.firebaseapp.com",
  projectId: "admin-panel-7418d",
  storageBucket: "admin-panel-7418d.appspot.com",
  messagingSenderId: "158197054777",
  appId: "1:158197054777:web:202164ada59e2c0b59bce8"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);

// Lưu trữ dữ liệu bài viết vào Realtime Database
function savePostToFirebase(post) {
  firebase.database().ref('posts').push(post);
}
// Hàm cập nhật danh sách bài viết trên trang index.html từ Firebase
function updateArticleListFromFirebase() {
  const articleList = document.getElementById('article-list');
  articleList.innerHTML = '';

  const postsRef = ref(database, 'posts');
  onValue(postsRef, (snapshot) => {
    snapshot.forEach((childSnapshot) => {
      const post = childSnapshot.val();
      const articleLink = document.createElement('a');
      articleLink.href = '#'; // Thay bằng link đến trang chi tiết bài viết khi có
      articleLink.textContent = post.appName;

      const articleItem = document.createElement('div');
      articleItem.classList.add('article-item');
      articleItem.appendChild(articleLink);

      articleList.appendChild(articleItem);
    });
  });
}

// Lấy form và lắng nghe sự kiện submit để lưu bài viết
const postForm = document.getElementById('post-form');
postForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const appName = postForm['appName'].value;
  const appImage = postForm['appImage'].value;
  const appDescription = postForm['appDescription'].value;
  const developer = postForm['developer'].value;
  const iosCompatibility = postForm['iosCompatibility'].value;
  const appVersion = postForm['appVersion'].value;
  const downloadLink = postForm['downloadLink'].value;
  const category = postForm['category'].value;

  const newPost = {
    appName,
    appImage,
    appDescription,
    developer,
    iosCompatibility,
    appVersion,
    downloadLink,
    category
  };

  savePostToFirebase(newPost);
  postForm.reset(); // Reset form fields after submission
});

// Cập nhật danh sách bài viết khi trang được tải
updateArticleListFromFirebase();