const firebaseConfig = {
  apiKey: "AIzaSyABo1KBDlLJdeNIP5diteT2J0MMemgLigo",
  authDomain: "admin-panel-7418d.firebaseapp.com",
  projectId: "admin-panel-7418d",
  storageBucket: "admin-panel-7418d.appspot.com",
  messagingSenderId: "158197054777",
  appId: "1:158197054777:web:202164ada59e2c0b59bce8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Function to save post to Firebase
function savePostToFirebase(post) {
  return push(ref(database, 'posts'), post); // Return the promise to handle success and error
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

  // Lưu dữ liệu vào Firebase
  firebase.database().ref('posts').push(newPost)
    .then(() => {
      // Thông báo thành công
      document.getElementById('message').textContent = 'Bài viết đã được đăng thành công.';
      // Reset form
      postForm.reset();
    })
    .catch((error) => {
      // Xử lý lỗi
      console.error('Lỗi khi lưu bài viết:', error);
      document.getElementById('message').textContent = 'Đã xảy ra lỗi khi đăng bài viết.';
    });
});