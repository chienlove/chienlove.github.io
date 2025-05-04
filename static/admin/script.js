document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Netlify Identity
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      container: '#login-btn'
    });

    // Xử lý sự kiện
    netlifyIdentity.on('init', user => {
      console.log('Init:', user);
      updateUI(user);
    });

    netlifyIdentity.on('login', user => {
      console.log('Login:', user.email);
      updateUI(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      console.log('Logged out');
      updateUI(null);
    });

    // Kiểm tra trạng thái ban đầu
    updateUI(netlifyIdentity.currentUser());
  }

  // Cập nhật giao diện
  function updateUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const dashboard = document.getElementById('dashboard');

    if (user) {
      loginBtn.textContent = `Đăng xuất (${user.email})`;
      loginBtn.style.backgroundColor = '#f44336';
      dashboard.style.display = 'flex';
      loadPosts();
    } else {
      loginBtn.textContent = 'Đăng nhập';
      loginBtn.style.backgroundColor = '#4CAF50';
      dashboard.style.display = 'none';
    }
  }

  // Tải bài viết
  async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<div class="loading">Đang tải bài viết...</div>';

    try {
      if (!netlifyIdentity.currentUser()) {
        throw new Error('Vui lòng đăng nhập');
      }

      const response = await fetch('/.netlify/git/github/contents/content', {
        credentials: 'include',
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Lỗi tải dữ liệu');
      }

      const data = await response.json();
      const posts = [];

      // Lấy bài viết từ các thư mục con
      for (const item of data) {
        if (item.type === 'dir') {
          const res = await fetch(`/.netlify/git/github/contents/content/${item.name}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (res.ok) {
            const files = await res.json();
            files.forEach(file => {
              if (file.type === 'file' && file.name.endsWith('.md')) {
                posts.push({
                  name: file.name.replace('.md', ''),
                  path: file.path,
                  category: item.name
                });
              }
            });
          }
        }
      }

      renderPosts(posts);
    } catch (error) {
      console.error('Lỗi:', error);
      postsList.innerHTML = `
        <div class="error">
          ${error.message}<br>
          <button onclick="location.reload()">Thử lại</button>
        </div>
      `;
    }
  }

  // Hiển thị bài viết
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    
    if (posts.length === 0) {
      postsList.innerHTML = '<div class="empty">Không có bài viết nào</div>';
      return;
    }

    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <span class="post-category">${post.category}</span>
        <span class="post-title">${post.name}</span>
        <button onclick="editPost('${post.path}')">Sửa</button>
      </div>
    `).join('');
  }

  // Thêm bài mới
  document.getElementById('create-post').addEventListener('click', () => {
    if (!netlifyIdentity.currentUser()) {
      alert('Vui lòng đăng nhập');
      return;
    }
    document.getElementById('post-form').style.display = 'block';
  });

  document.getElementById('submit-post').addEventListener('click', async () => {
    const category = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }

    try {
      const response = await fetch(`/.netlify/git/github/contents/content/${category}/${title}.md`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Thêm bài viết mới: ${title}`,
          content: btoa(unescape(encodeURIComponent(content)))
        })
      });

      if (!response.ok) throw new Error(await response.text());

      alert('Đã thêm bài viết thành công!');
      document.getElementById('post-form').style.display = 'none';
      document.getElementById('post-title').value = '';
      document.getElementById('post-content').value = '';
      loadPosts();
    } catch (error) {
      console.error('Lỗi:', error);
      alert(`Lỗi: ${error.message || 'Không thể thêm bài viết'}`);
    }
  });
});

// Hàm sửa bài viết
function editPost(path) {
  console.log('Sửa bài:', path);
  alert(`Chức năng sửa bài "${path}" đang được phát triển`);
}