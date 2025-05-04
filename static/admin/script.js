document.addEventListener('DOMContentLoaded', () => {
  // 1. KHỞI TẠO NETLIFY IDENTITY
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity' // Thêm URL cụ thể
    });

    // 2. XỬ LÝ SỰ KIỆN ĐĂNG NHẬP
    const handleAuthChange = (user) => {
      const loginBtn = document.getElementById('login-btn');
      const dashboard = document.getElementById('dashboard');
      
      if (user) {
        console.log('Đã đăng nhập:', user.email);
        loginBtn.textContent = `Đăng xuất (${user.email})`;
        loginBtn.style.backgroundColor = '#f44336';
        dashboard.style.display = 'flex';
        loadPosts();
      } else {
        console.log('Chưa đăng nhập');
        loginBtn.textContent = 'Đăng nhập';
        loginBtn.style.backgroundColor = '#4CAF50';
        dashboard.style.display = 'none';
      }
    };

    netlifyIdentity.on('init', handleAuthChange);
    netlifyIdentity.on('login', (user) => {
      handleAuthChange(user);
      netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => handleAuthChange(null));

    // 3. KIỂM TRA TRẠNG THÁI BAN ĐẦU
    handleAuthChange(netlifyIdentity.currentUser());
  }

  // 4. TẢI BÀI VIẾT (ĐÃ BỔ SUNG XỬ LÝ LỖI)
  async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';

    try {
      // Kiểm tra đăng nhập
      const user = netlifyIdentity.currentUser();
      if (!user) throw new Error('Bạn chưa đăng nhập');

      // Kiểm tra token
      if (!user.token) {
        await new Promise(resolve => netlifyIdentity.on('login', resolve));
      }

      // Gọi API với token
      const response = await fetch('/.netlify/git/github/contents/content', {
        headers: {
          'Authorization': `Bearer ${user.token.access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      // Xử lý response
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Dữ liệu nhận được:', data);

      // Hiển thị bài viết
      renderPosts(data.filter(item => item.type === 'file'));

    } catch (error) {
      console.error('Lỗi tải bài viết:', error);
      postsList.innerHTML = `
        <div class="error">
          ❌ Lỗi: ${error.message || 'Không thể tải dữ liệu'}
          ${error.message.includes('401') ? 
            '<p>Vui lòng đăng nhập lại</p>' : 
            '<button onclick="location.reload()">Thử lại</button>'}
        </div>
      `;
    }
  }

  // 5. CÁC HÀM PHỤ TRỢ
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = posts.length > 0 ? 
      posts.map(post => `
        <div class="post-item">
          <span class="post-title">${post.name.replace('.md', '')}</span>
          <button onclick="editPost('${post.path}')">Sửa</button>
        </div>
      `).join('') : 
      '<div class="empty">Không có bài viết nào</div>';
  }

  // 6. XỬ LÝ NÚT NEW POST
  document.getElementById('create-post').addEventListener('click', () => {
    if (!netlifyIdentity.currentUser()) {
      alert('Vui lòng đăng nhập trước');
      return;
    }
    document.getElementById('post-form').style.display = 'block';
  });
});

// Hàm toàn cục
function editPost(path) {
  console.log('Bắt đầu sửa:', path);
  alert(`Chức năng sửa bài đang được phát triển\nPath: ${path}`);
}