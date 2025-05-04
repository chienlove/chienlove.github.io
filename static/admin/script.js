document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = 'content';
  let isProcessing = false; // Biến chặn thao tác khi đang xử lý

  // Đăng ký hàm toàn cục trước khi sử dụng
  registerGlobalFunctions();

  // 1. KHỞI TẠO NETLIFY IDENTITY
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity'
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
        loadFolderContents(currentFolder); // Tải thư mục gốc
      } else {
        console.log('Chưa đăng nhập');
        loginBtn.textContent = 'Đăng nhập';
        loginBtn.style.backgroundColor = '#4CAF50';
        dashboard.style.display = 'none';
        allPosts = []; // Reset danh sách bài viết
      }
    };

    netlifyIdentity.on('init', handleAuthChange);
    netlifyIdentity.on('login', (user) => {
      handleAuthChange(user);
      netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => handleAuthChange(null));
    
    netlifyIdentity.on('close', () => {
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

  // 4. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(path) {
    if (isProcessing) return;
    isProcessing = true;
    
    currentFolder = path || 'content';
    const postsList = document.getElementById('posts-list');
    const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
    
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    updateBreadcrumb(path);

    try {
      // Kiểm tra đăng nhập
      const user = netlifyIdentity.currentUser();
      if (!user) throw new Error('Bạn chưa đăng nhập');

      // Kiểm tra token
      if (!user.token?.access_token) {
        netlifyIdentity.logout();
        throw new Error('Phiên làm việc hết hạn, vui lòng đăng nhập lại');
      }

      // Kiểm tra path hợp lệ
      if (!isValidPath(path)) {
        throw new Error('Đường dẫn không hợp lệ');
      }

      // Gọi API với token
      const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
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

      // Lưu dữ liệu vào biến toàn cục
      allPosts = Array.isArray(data) ? data : [data];
      
      // Hiển thị nội dung
      renderFolderContents(allPosts, path);

    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
      postsList.innerHTML = `
        <div class="error">
          ❌ Lỗi: ${escapeHtml(error.message || 'Không thể tải dữ liệu')}
          ${error.message && error.message.includes('401') ? 
            '<p>Vui lòng đăng nhập lại</p>' : 
            `<button onclick="window.loadFolderContents('${escapeHtml(path)}')">Thử lại</button>`}
        </div>
      `;
    } finally {
      isProcessing = false;
    }
  }

  // 5. TẠO BREADCRUMB
  function createBreadcrumb() {
    const dashboard = document.getElementById('dashboard');
    const breadcrumb = document.createElement('div');
    breadcrumb.id = 'breadcrumb';
    breadcrumb.className = 'breadcrumb';
    dashboard.insertBefore(breadcrumb, dashboard.firstChild);
    return breadcrumb;
  }

  // 6. CẬP NHẬT BREADCRUMB
  function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    const parts = path.split('/');
    
    let breadcrumbHTML = `<span class="crumb" onclick="window.loadFolderContents('content')">Home</span>`;
    let currentPath = 'content';
    
    for (let i = 1; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      breadcrumbHTML += ` > <span class="crumb" onclick="window.loadFolderContents('${escapeHtml(currentPath)}')">${escapeHtml(parts[i])}</span>`;
    }
    
    breadcrumb.innerHTML = breadcrumbHTML;
  }

  // 7. HIỂN THỊ NỘI DUNG THƯ MỤC
  function renderFolderContents(items, currentPath) {
    const postsList = document.getElementById('posts-list');
    
    if (!items || items.length === 0) {
      postsList.innerHTML = '<div class="empty">Không có nội dung</div>';
      return;
    }
    
    // Sắp xếp: thư mục trước, file sau
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });
    
    postsList.innerHTML = `
      <div class="folder-header">
        <div class="folder-path">${escapeHtml(currentPath)}</div>
        <button id="add-post-btn" class="action-btn">Thêm bài viết</button>
        <button id="add-folder-btn" class="action-btn">Thêm thư mục</button>
      </div>
      <div class="content-list">
        ${sortedItems.map(item => {
          if (item.type === 'dir') {
            return `
              <div class="folder-item">
                <div class="folder-name" onclick="window.loadFolderContents('${escapeHtml(item.path)}')">
                  📁 ${escapeHtml(item.name)}
                </div>
                <div class="folder-actions">
                  <button onclick="window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', true)">Xóa</button>
                </div>
              </div>
            `;
          } else {
            // Hiển thị file (chỉ hiển thị file .md)
            if (!item.name.toLowerCase().endsWith('.md')) return '';
            
            return `
              <div class="post-item">
                <span class="post-title">${escapeHtml(item.name.replace('.md', '').replace('.MD', ''))}</span>
                <div class="post-actions">
                  <button onclick="window.editPost('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}')">Sửa</button>
                  <button onclick="window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', false)">Xóa</button>
                  <button onclick="window.viewPost('${escapeHtml(item.path)}')">Xem</button>
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;
    
    // Thêm sự kiện cho các nút
    document.getElementById('add-post-btn').addEventListener('click', () => addNewPost(currentPath));
    document.getElementById('add-folder-btn').addEventListener('click', () => addNewFolder(currentPath));
  }

  // 8. XỬ LÝ NÚT NEW POST
  document.getElementById('create-post').addEventListener('click', () => {
    if (!netlifyIdentity.currentUser()) {
      alert('Vui lòng đăng nhập trước');
      return;
    }
    addNewPost(currentFolder);
  });

  // 9. THÊM BÀI VIẾT MỚI
  function addNewPost(folderPath) {
    // Hiển thị modal tạo bài viết mới
    let modal = document.getElementById('create-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'create-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Tạo bài viết mới</h2>
          <span class="close-btn" onclick="document.getElementById('create-modal').style.display='none'">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="new-title">Tiêu đề:</label>
            <input type="text" id="new-title" placeholder="Nhập tiêu đề bài viết" />
          </div>
          <div class="form-group">
            <label for="new-content">Nội dung:</label>
            <textarea id="new-content" rows="20" placeholder="Nội dung bài viết (Markdown)"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="window.createNewPost('${escapeHtml(folderPath)}')">Tạo</button>
          <button onclick="document.getElementById('create-modal').style.display='none'">Hủy</button>
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
    addModalStyles();
  }

  // 10. THÊM THƯ MỤC MỚI
  function addNewFolder(parentPath) {
    const folderName = prompt('Nhập tên thư mục mới:');
    
    if (!folderName || !folderName.trim()) {
      return;
    }
    
    // Chuẩn bị tên thư mục
    const formattedName = formatFolderName(folderName.trim());
    const path = `${parentPath}/${formattedName}/README.md`;
    
    createNewPost(path, `# ${folderName}\n\nThư mục này chứa nội dung về ${folderName}.`);
  }

  // Hàm hỗ trợ
  function registerGlobalFunctions() {
    window.loadFolderContents = loadFolderContents;
    window.editPost = editPost;
    window.deleteItem = deleteItem;
    window.viewPost = viewPost;
    window.createNewPost = createNewPost;
    window.addNewPost = addNewPost;
    window.addNewFolder = addNewFolder;
  }

  function isValidPath(path) {
    return path && !path.includes('../') && !path.startsWith('/') && !path.includes('//');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatFolderName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  function addModalStyles() {
    if (!document.getElementById('modal-styles')) {
      const styles = document.createElement('style');
      styles.id = 'modal-styles';
      styles.textContent = `
        .modal { /* CSS giữ nguyên như trước */ }
        .modal-content { /* CSS giữ nguyên như trước */ }
        /* Thêm các style cần thiết khác */
      `;
      document.head.appendChild(styles);
    }
  }
});

// 11. CHỨC NĂNG XEM BÀI VIẾT
function viewPost(path) {
  console.log('Xem bài viết:', path);
  
  // Tìm URL thực tế của bài viết
  const slug = path.replace('content/', '').replace(/\.md$/i, '');
  const postUrl = `${window.location.origin}/${slug}`;
  
  window.open(postUrl, '_blank');
}

// 12. CHỨC NĂNG SỬA BÀI VIẾT
async function editPost(path, sha) {
  console.log('Bắt đầu sửa:', path, 'SHA:', sha);
  
  if (!window.netlifyIdentity?.currentUser()) {
    alert('Vui lòng đăng nhập để sửa bài viết');
    return;
  }
  
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user?.token?.access_token) {
      window.netlifyIdentity.logout();
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung: ${response.status}`);
    }
    
    const fileData = await response.json();
    const content = atob(fileData.content);
    showEditModal(path, content, sha);
    
  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`);
  }
}

// 13. HIỂN THỊ MODAL CHỈNH SỬA
function showEditModal(path, content, sha) {
  const modal = document.getElementById('edit-modal') || document.createElement('div');
  modal.id = 'edit-modal';
  modal.className = 'modal';
  document.body.appendChild(modal);
  
  const filename = path.split('/').pop();
  
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Chỉnh sửa bài viết</h2>
        <span class="close-btn" onclick="document.getElementById('edit-modal').style.display='none'">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-title">Tiêu đề:</label>
          <input type="text" id="edit-title" value="${escapeHtml(filename.replace(/\.md$/i, ''))}" />
        </div>
        <div class="form-group">
          <label for="edit-content">Nội dung:</label>
          <textarea id="edit-content" rows="20">${escapeHtml(content)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button onclick="window.savePost('${escapeHtml(path)}', '${escapeHtml(sha)}')">Lưu</button>
        <button onclick="document.getElementById('edit-modal').style.display='none'">Hủy</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// 14. LƯU BÀI VIẾT
async function savePost(path, sha) {
  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) {
      window.netlifyIdentity.logout();
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    const titleInput = document.getElementById('edit-title');
    const contentTextarea = document.getElementById('edit-content');
    
    if (!titleInput || !contentTextarea) {
      throw new Error('Không tìm thấy form chỉnh sửa');
    }
    
    const title = titleInput.value.trim();
    const content = contentTextarea.value;
    
    if (!title) {
      alert('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    
    // Chuẩn bị dữ liệu cập nhật
    const updateData = {
      message: `Cập nhật bài viết: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      branch: 'main'
    };
    
    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(updateData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
    }
    
    document.getElementById('edit-modal').style.display = 'none';
    alert('Cập nhật bài viết thành công!');
    const folderPath = path.substring(0, path.lastIndexOf('/'));
    window.loadFolderContents(folderPath);
    
  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể lưu bài viết'}`);
  }
}

// 15. XÓA BÀI VIẾT HOẶC THƯ MỤC
async function deleteItem(path, sha, isFolder) {
  const itemType = isFolder ? 'thư mục' : 'bài viết';
  if (!confirm(`Bạn có chắc chắn muốn xóa ${itemType} này không?`)) return;
  
  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) {
      window.netlifyIdentity.logout();
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    if (isFolder) {
      await deleteFolderRecursive(path, user.token.access_token);
    } else {
      const deleteData = {
        message: `Xóa ${itemType}: ${path}`,
        sha: sha,
        branch: 'main'
      };
      
      const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(deleteData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
      }
    }
    
    alert(`Xóa ${itemType} thành công!`);
    const parentFolder = path.split('/').slice(0, -1).join('/');
    window.loadFolderContents(parentFolder || 'content');
    
  } catch (error) {
    console.error(`Lỗi khi xóa ${itemType}:`, error);
    alert(`Lỗi: ${error.message || `Không thể xóa ${itemType}`}`);
  }
}

// 16. XÓA THƯ MỤC ĐỆ QUY
async function deleteFolderRecursive(folderPath, token) {
  try {
    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(folderPath)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung thư mục: ${response.status}`);
    }
    
    const items = await response.json();
    
    for (const item of items) {
      if (item.type === 'dir') {
        await deleteFolderRecursive(item.path, token);
      } else {
        const deleteData = {
          message: `Xóa file: ${item.path}`,
          sha: item.sha,
          branch: 'main'
        };
        
        const deleteResponse = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(item.path)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify(deleteData)
        });
        
        if (!deleteResponse.ok) {
          throw new Error(`Không thể xóa file ${item.path}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Lỗi khi xóa thư mục đệ quy:', error);
    throw error;
  }
}

// 17. TẠO BÀI VIẾT MỚI (PHIÊN BẢN HOÀN CHỈNH)
async function createNewPost(path, defaultContent = null) {
  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) {
      window.netlifyIdentity.logout();
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    let title, content;
    
    if (defaultContent === null) {
      // Mode tạo bài viết thông thường
      const titleInput = document.getElementById('new-title');
      const contentTextarea = document.getElementById('new-content');
      
      if (!titleInput || !contentTextarea) {
        throw new Error('Không tìm thấy form tạo bài viết');
      }
      
      title = titleInput.value.trim();
      content = contentTextarea.value;
      
      if (!title) {
        alert('Vui lòng nhập tiêu đề bài viết');
        return;
      }
      
      // Tạo filename từ title
      const filename = formatFolderName(title) + '.md';
      path = `${path}/${filename}`;
    } else {
      // Mode tạo thư mục (tạo README.md)
      title = path.split('/').slice(-2, -1)[0];
      content = defaultContent;
    }
    
    const createData = {
      message: `Tạo nội dung mới: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: 'main'
    };
    
    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(createData)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Lỗi HTTP ${response.status}`);
    }
    
    // Đóng modal nếu đang mở
    const createModal = document.getElementById('create-modal');
    if (createModal) {
      createModal.style.display = 'none';
    }
    
    // Tải lại thư mục cha
    const parentFolder = path.split('/').slice(0, -1).join('/');
    if (defaultContent === null) {
      alert('Tạo bài viết thành công!');
    }
    window.loadFolderContents(parentFolder || 'content');
    
  } catch (error) {
    console.error('Lỗi khi tạo nội dung mới:', error);
    alert(`Lỗi: ${error.message || 'Không thể tạo nội dung mới'}`);
  }
}