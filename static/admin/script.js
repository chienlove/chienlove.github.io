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
    
    // Thêm xử lý khi đóng modal đăng nhập
    netlifyIdentity.on('close', () => {
      // Kiểm tra nếu user vẫn null sau khi đóng modal
      if (!netlifyIdentity.currentUser()) {
        handleAuthChange(null);
      }
    });

    // 3. KIỂM TRA TRẠNG THÁI BAN ĐẦU
    handleAuthChange(netlifyIdentity.currentUser());
    
    // Thêm sự kiện click cho nút đăng nhập
    document.getElementById('login-btn').addEventListener('click', () => {
      if (netlifyIdentity.currentUser()) {
        netlifyIdentity.logout();
      } else {
        netlifyIdentity.open('login');
      }
    });
  }

  // 4. TẢI BÀI VIẾT (ĐÃ BỔ SUNG XỬ LÝ LỖI)
  async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';

    try {
      // Kiểm tra đăng nhập
      const user = netlifyIdentity.currentUser();
      if (!user) throw new Error('Bạn chưa đăng nhập');

      // Kiểm tra token cải tiến
      if (!user.token || !user.token.access_token) {
        console.log('Token không hợp lệ, yêu cầu đăng nhập lại');
        netlifyIdentity.logout();
        throw new Error('Phiên làm việc hết hạn, vui lòng đăng nhập lại');
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
          ${error.message && error.message.includes('401') ? 
            '<p>Vui lòng đăng nhập lại</p>' : 
            '<button onclick="location.reload()">Thử lại</button>'}
        </div>
      `;
    }
  }

  // 5. CÁC HÀM PHỤ TRỢ
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    
    if (!posts || posts.length === 0) {
      postsList.innerHTML = '<div class="empty">Không có bài viết nào</div>';
      return;
    }
    
    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <span class="post-title">${post.name.replace('.md', '')}</span>
        <div class="post-actions">
          <button onclick="editPost('${post.path}', '${post.sha}')">Sửa</button>
        </div>
      </div>
    `).join('');
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
function editPost(path, sha) {
  console.log('Bắt đầu sửa:', path, 'SHA:', sha);
  
  // Kiểm tra đăng nhập trước khi cho phép sửa
  if (!window.netlifyIdentity.currentUser()) {
    alert('Vui lòng đăng nhập để sửa bài viết');
    return;
  }
  
  // Lưu thông tin bài viết vào localStorage để sử dụng trong form sửa
  localStorage.setItem('editing_post', JSON.stringify({path, sha}));
  
  // Hiển thị form (giả sử bạn có form sửa bài)
  document.getElementById('post-form').style.display = 'block';
  
  // Tải nội dung bài viết (triển khai sau)
  loadPostContent(path);
}

// Hàm phụ trợ để tải nội dung bài viết khi sửa
async function loadPostContent(path) {
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    // Tạm thời hiển thị thông báo
    alert(`Đang tải nội dung bài viết: ${path}`);
    
    // Phần code tải nội dung sẽ được triển khai sau
    // ...
  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`);
  }
}