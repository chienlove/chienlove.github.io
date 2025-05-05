// cms-admin.js
document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = 'content';
  let isProcessing = false;

  // 1. KHỞI TẠO NETLIFY IDENTITY
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity',
      enableOperator: true
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
        loadFolderContents(currentFolder);
      } else {
        console.log('Chưa đăng nhập');
        loginBtn.textContent = 'Đăng nhập';
        loginBtn.style.backgroundColor = '#4CAF50';
        dashboard.style.display = 'none';
        allPosts = [];
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

  // 4. HÀM GỌI API AN TOÀN
  async function callGitHubAPI(url, method = 'GET', body = null) {
    const user = netlifyIdentity.currentUser();
    if (!user?.token?.access_token) {
      throw new Error('Bạn chưa đăng nhập');
    }

    const headers = {
      'Authorization': `Bearer ${user.token.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'X-Operator': 'netlify',
      'X-Operator-Id': user.id,
      'X-Netlify-User': user.id
    };

    const config = {
      method: method,
      headers: headers,
      credentials: 'include'
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      throw new Error(error?.message || `Lỗi HTTP ${response.status}`);
    }

    return response.json();
  }

  // 5. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(path) {
    if (isProcessing) return;
    isProcessing = true;
    
    currentFolder = path || 'content';
    const postsList = document.getElementById('posts-list');
    const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
    
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    updateBreadcrumb(path);

    try {
      // Kiểm tra path hợp lệ
      if (!isValidPath(path)) {
        throw new Error('Đường dẫn không hợp lệ');
      }

      const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
      console.log('Dữ liệu nhận được:', data);

      allPosts = Array.isArray(data) ? data : [data];
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
      
      if (error.message.includes('Operator') || error.message.includes('401')) {
        netlifyIdentity.logout();
      }
    } finally {
      isProcessing = false;
    }
  }

  // 6. TẠO BREADCRUMB
  function createBreadcrumb() {
    const dashboard = document.getElementById('dashboard');
    const breadcrumb = document.createElement('div');
    breadcrumb.id = 'breadcrumb';
    breadcrumb.className = 'breadcrumb';
    dashboard.insertBefore(breadcrumb, dashboard.firstChild);
    return breadcrumb;
  }

  // 7. CẬP NHẬT BREADCRUMB
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

  // 8. HIỂN THỊ NỘI DUNG THƯ MỤC
  function renderFolderContents(items, currentPath) {
    const postsList = document.getElementById('posts-list');
    
    if (!items || items.length === 0) {
      postsList.innerHTML = '<div class="empty">Không có nội dung</div>';
      return;
    }
    
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
            if (!item.name.toLowerCase().endsWith('.md')) return '';
            
            return `
              <div class="post-item">
                <span class="post-title">${escapeHtml(item.name.replace(/\.md$/i, ''))}</span>
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
    
    document.getElementById('add-post-btn').addEventListener('click', () => addNewPost(currentPath));
    document.getElementById('add-folder-btn').addEventListener('click', () => addNewFolder(currentPath));
  }

  // 9. THÊM BÀI VIẾT MỚI
  function addNewPost(folderPath) {
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
    if (!folderName || !folderName.trim()) return;
    
    const formattedName = formatFolderName(folderName.trim());
    const path = `${parentPath}/${formattedName}/README.md`;
    
    createNewPost(path, `# ${folderName}\n\nThư mục này chứa nội dung về ${folderName}.`);
  }

  // Hàm hỗ trợ
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
        .modal {
          display: none;
          position: fixed;
          z-index: 1000;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0,0,0,0.5);
        }
        .modal-content {
          background-color: #fff;
          margin: 5% auto;
          padding: 20px;
          width: 80%;
          max-width: 900px;
          border-radius: 5px;
          box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #ddd;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .close-btn {
          font-size: 24px;
          cursor: pointer;
        }
        .form-group {
          margin-bottom: 15px;
        }
        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: bold;
        }
        .form-group input, .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .modal-footer {
          text-align: right;
          border-top: 1px solid #ddd;
          padding-top: 15px;
          margin-top: 20px;
        }
        .modal-footer button {
          padding: 8px 16px;
          margin-left: 10px;
          cursor: pointer;
        }
        .breadcrumb {
          padding: 10px 0;
          margin-bottom: 20px;
        }
        .crumb {
          cursor: pointer;
          color: #0066cc;
        }
        .crumb:hover {
          text-decoration: underline;
        }
        .folder-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: #f5f5f5;
          border-radius: 4px;
          margin-bottom: 15px;
        }
        .folder-path {
          font-weight: bold;
        }
        .action-btn {
          padding: 5px 10px;
          margin-left: 10px;
          cursor: pointer;
        }
        .folder-item, .post-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border-bottom: 1px solid #eee;
        }
        .folder-name, .post-title {
          cursor: pointer;
          font-weight: bold;
          color: #333;
        }
        .folder-name:hover {
          color: #0066cc;
        }
        .post-actions button, .folder-actions button {
          margin-left: 5px;
          padding: 3px 8px;
        }
        .loading, .empty, .error {
          padding: 20px;
          text-align: center;
          font-size: 18px;
        }
        .error {
          color: #d32f2f;
        }
      `;
      document.head.appendChild(styles);
    }
  }

  // Đăng ký hàm toàn cục
  window.loadFolderContents = loadFolderContents;
  window.editPost = editPost;
  window.deleteItem = deleteItem;
  window.viewPost = viewPost;
  window.createNewPost = createNewPost;
  window.addNewPost = addNewPost;
  window.addNewFolder = addNewFolder;
});

// 11. CHỨC NĂNG XEM BÀI VIẾT
function viewPost(path) {
  const slug = path.replace('content/', '').replace(/\.md$/i, '');
  const postUrl = `${window.location.origin}/${slug}`;
  window.open(postUrl, '_blank');
}

// 12. CHỨC NĂNG SỬA BÀI VIẾT
async function editPost(path, sha) {
  try {
    const fileData = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
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
    
    const updateData = {
      message: `Cập nhật bài viết: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      branch: 'main'
    };
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, 'PUT', updateData);
    
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
    if (isFolder) {
      await deleteFolderRecursive(path);
    } else {
      const deleteData = {
        message: `Xóa ${itemType}: ${path}`,
        sha: sha,
        branch: 'main'
      };
      
      await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, 'DELETE', deleteData);
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
async function deleteFolderRecursive(folderPath) {
  const items = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(folderPath)}`);
  
  for (const item of items) {
    if (item.type === 'dir') {
      await deleteFolderRecursive(item.path);
    } else {
      const deleteData = {
        message: `Xóa file: ${item.path}`,
        sha: item.sha,
        branch: 'main'
      };
      
      await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(item.path)}`, 'DELETE', deleteData);
    }
  }
}

// 17. TẠO BÀI VIẾT MỚI
async function createNewPost(path, defaultContent = null) {
  try {
    let title, content;
    
    if (defaultContent === null) {
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
      
      const filename = formatFolderName(title) + '.md';
      path = `${path}/${filename}`;
    } else {
      title = path.split('/').slice(-2, -1)[0];
      content = defaultContent;
    }
    
    const createData = {
      message: `Tạo nội dung mới: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: 'main'
    };
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, 'PUT', createData);
    
    const createModal = document.getElementById('create-modal');
    if (createModal) {
      createModal.style.display = 'none';
    }
    
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

// Hàm hỗ trợ toàn cục
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

// Hàm gọi API toàn cục
async function callGitHubAPI(url, method = 'GET', body = null) {
  const user = window.netlifyIdentity?.currentUser();
  if (!user?.token?.access_token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  const headers = {
    'Authorization': `Bearer ${user.token.access_token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-Operator': 'netlify',
    'X-Operator-Id': user.id,
    'X-Netlify-User': user.id
  };

  const config = {
    method: method,
    headers: headers,
    credentials: 'include'
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Lỗi HTTP ${response.status}`);
  }

  return response.json();
}