document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Netlify Identity
  netlifyIdentity.init();

  const loginBtn = document.getElementById('login-btn');
  const dashboard = document.getElementById('dashboard');

  // Hàm cập nhật giao diện dựa trên trạng thái đăng nhập
  function updateUI(user) {
    if (user) {
      loginBtn.textContent = 'Logout';
      dashboard.style.display = 'flex';
      loadPosts(); // Tải dữ liệu khi đăng nhập
    } else {
      loginBtn.textContent = 'Login';
      dashboard.style.display = 'none';
    }
  }

  // Kiểm tra ngay khi tải trang
  updateUI(netlifyIdentity.currentUser());

  // Xử lý sự kiện đăng nhập/thoát
  netlifyIdentity.on('login', (user) => {
    updateUI(user);
  });

  netlifyIdentity.on('logout', () => {
    updateUI(null);
  });

  // Xử lý nút Login/Logout
  loginBtn.addEventListener('click', () => {
    if (netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
    } else {
      netlifyIdentity.open();
    }
  });

  // Load dữ liệu từ Git Gateway (ví dụ: bài viết)
  async function loadPosts() {
    try {
      const response = await fetch('/.netlify/git/github/contents/content/posts', {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });
      const posts = await response.json();
      renderPosts(posts);
    } catch (error) {
      console.error('Error loading posts:', error);
    }
  }

  // Hiển thị danh sách bài viết (tùy chỉnh theo nhu cầu)
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <h3>${post.name.replace('.md', '')}</h3>
        <button onclick="editPost('${post.path}')">Edit</button>
      </div>
    `).join('');
  }

  // Chuyển đổi giữa các section (posts/settings)
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.content > div').forEach(section => {
        section.style.display = 'none';
      });
      document.getElementById(`${e.target.dataset.section}-section`).style.display = 'block';
    });
  });
});

// Hàm chỉnh sửa bài viết (ví dụ)
window.editPost = (path) => {
  alert(`Edit post: ${path}`);
};