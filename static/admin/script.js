// Khởi tạo Netlify Identity
document.addEventListener('DOMContentLoaded', () => {
  netlifyIdentity.init();

  const loginBtn = document.getElementById('login-btn');
  const dashboard = document.getElementById('dashboard');

  // Xử lý đăng nhập
  loginBtn.addEventListener('click', () => {
    netlifyIdentity.open();
  });

  // Kiểm tra trạng thái đăng nhập
  netlifyIdentity.on('init', (user) => {
    if (user) {
      loginBtn.textContent = 'Logout';
      dashboard.style.display = 'flex';
      loadPosts();
    } else {
      loginBtn.textContent = 'Login';
      dashboard.style.display = 'none';
    }
  });

  // Xử lý logout
  loginBtn.addEventListener('click', () => {
    if (netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
      window.location.reload();
    }
  });

  // Load dữ liệu từ Git Gateway
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

  // Hiển thị danh sách bài viết
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <h3>${post.name.replace('.md', '')}</h3>
        <button onclick="editPost('${post.path}')">Edit</button>
      </div>
    `).join('');
  }

  // Chuyển đổi giữa các section
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('#posts-section, #settings-section').forEach(section => {
        section.style.display = 'none';
      });
      document.getElementById(`${e.target.dataset.section}-section`).style.display = 'block';
    });
  });
});

// Hàm chỉnh sửa bài viết (cần triển khai thêm)
window.editPost = (path) => {
  alert(`Edit post: ${path}`);
};