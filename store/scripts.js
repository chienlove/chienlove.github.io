// Khởi tạo cấu hình Firebase
const firebaseConfig = {
  apiKey: "AIzaSyABo1KBDlLJdeNIP5diteT2J0MMemgLigo",
  authDomain: "admin-panel-7418d.firebaseapp.com",
  databaseURL: "https://admin-panel-7418d-default-rtdb.firebaseio.com",
  projectId: "admin-panel-7418d",
  storageBucket: "admin-panel-7418d.appspot.com",
  messagingSenderId: "158197054777",
  appId: "1:158197054777:web:202164ada59e2c0b59bce8"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Lưu trữ dữ liệu bài viết vào Realtime Database
function savePostToFirebase(post) {
  return database.ref('posts').push(post);
}

// Lấy form và lắng nghe sự kiện submit để lưu bài viết
const postForm = document.getElementById('post-form');
postForm.addEventListener('submit', async (e) => {
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

  try {
    await savePostToFirebase(newPost);
    document.getElementById('message').textContent = 'Bài viết đã được đăng thành công.';
    postForm.reset(); // Reset form fields after submission
  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    document.getElementById('message').textContent = 'Đã xảy ra lỗi khi đăng bài viết.';
  }
});