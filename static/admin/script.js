document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = '';
  
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
        loadFolderContents('content'); // Tải thư mục gốc
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

  // 4. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(path) {
    currentFolder = path;
    const postsList = document.getElementById('posts-list');
    const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
    
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    updateBreadcrumb(path);

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
      const response = await fetch(`/.netlify/git/github/contents/${path}`, {
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
          ❌ Lỗi: ${error.message || 'Không thể tải dữ liệu'}
          ${error.message && error.message.includes('401') ? 
            '<p>Vui lòng đăng nhập lại</p>' : 
            '<button onclick="loadFolderContents('${path}')">Thử lại</button>'}
        </div>
      `;
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
    
    let breadcrumbHTML = `<span class="crumb" onclick="loadFolderContents('content')">Home</span>`;
    let currentPath = 'content';
    
    for (let i = 1; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      breadcrumbHTML += ` > <span class="crumb" onclick="loadFolderContents('${currentPath}')">${parts[i]}</span>`;
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
        <div class="folder-path">${currentPath}</div>
        <button id="add-post-btn" class="action-btn">Thêm bài viết</button>
        <button id="add-folder-btn" class="action-btn">Thêm thư mục</button>
      </div>
      <div class="content-list">
        ${sortedItems.map(item => {
          if (item.type === 'dir') {
            return `
              <div class="folder-item">
                <div class="folder-name" onclick="loadFolderContents('${item.path}')">
                  📁 ${item.name}
                </div>
                <div class="folder-actions">
                  <button onclick="deleteItem('${item.path}', '${item.sha}', true)">Xóa</button>
                </div>
              </div>
            `;
          } else {
            // Hiển thị file (chỉ hiển thị file .md)
            if (!item.name.endsWith('.md')) return '';
            
            return `
              <div class="post-item">
                <span class="post-title">${item.name.replace('.md', '')}</span>
                <div class="post-actions">
                  <button onclick="editPost('${item.path}', '${item.sha}')">Sửa</button>
                  <button onclick="deleteItem('${item.path}', '${item.sha}', false)">Xóa</button>
                  <button onclick="viewPost('${item.path}')">Xem</button>
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

  // Đăng ký hàm toàn cục
  window.loadFolderContents = loadFolderContents;
});

// 9. CHỨC NĂNG XEM BÀI VIẾT
function viewPost(path) {
  console.log('Xem bài viết:', path);
  
  // Tìm URL thực tế của bài viết bằng cách chuyển đổi đường dẫn
  const slug = path.replace('content/', '').replace('.md', '');
  const baseUrl = window.location.origin;
  const postUrl = `${baseUrl}/${slug}`;
  
  // Mở bài viết trong tab mới
  window.open(postUrl, '_blank');
}

// 10. CHỨC NĂNG SỬA BÀI VIẾT
async function editPost(path, sha) {
  console.log('Bắt đầu sửa:', path, 'SHA:', sha);
  
  // Kiểm tra đăng nhập
  if (!window.netlifyIdentity.currentUser()) {
    alert('Vui lòng đăng nhập để sửa bài viết');
    return;
  }
  
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    // Tải nội dung bài viết
    const response = await fetch(`/.netlify/git/github/contents/${path}`, {
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung: ${response.status}`);
    }
    
    const fileData = await response.json();
    
    // Giải mã nội dung Base64
    const content = atob(fileData.content);
    
    // Hiển thị modal chỉnh sửa
    showEditModal(path, content, sha);
    
  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`);
  }
}

// 11. HIỂN THỊ MODAL CHỈNH SỬA
function showEditModal(path, content, sha) {
  // Tạo modal nếu chưa tồn tại
  let modal = document.getElementById('edit-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'edit-modal';
    modal.className = 'modal';
    
    document.body.appendChild(modal);
  }
  
  // Tính toán tên bài viết và đường dẫn thư mục
  const filename = path.split('/').pop();
  const folderPath = path.substring(0, path.lastIndexOf('/'));
  
  // Cập nhật nội dung modal
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Chỉnh sửa bài viết</h2>
        <span class="close-btn" onclick="document.getElementById('edit-modal').style.display='none'">&times;</span>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="edit-title">Tiêu đề:</label>
          <input type="text" id="edit-title" value="${filename.replace('.md', '')}" />
        </div>
        <div class="form-group">
          <label for="edit-content">Nội dung:</label>
          <textarea id="edit-content" rows="20">${content}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button onclick="savePost('${path}', '${sha}')">Lưu</button>
        <button onclick="document.getElementById('edit-modal').style.display='none'">Hủy</button>
      </div>
    </div>
  `;
  
  // Hiển thị modal
  modal.style.display = 'block';
  
  // Thêm CSS cho modal nếu chưa có
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
      .folder-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        border-bottom: 1px solid #eee;
      }
      .folder-name {
        cursor: pointer;
        font-weight: bold;
        color: #333;
      }
      .folder-name:hover {
        color: #0066cc;
      }
    `;
    document.head.appendChild(styles);
  }
}

// 12. LƯU BÀI VIẾT
async function savePost(path, sha) {
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
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
      content: btoa(content), // Mã hóa nội dung thành Base64
      sha: sha,
      branch: 'main' // Hoặc branch mặc định của bạn
    };
    
    // Gửi yêu cầu cập nhật
    const response = await fetch(`/.netlify/git/github/contents/${path}`, {
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
    
    // Đóng modal
    document.getElementById('edit-modal').style.display = 'none';
    
    // Tải lại dữ liệu thư mục hiện tại
    alert('Cập nhật bài viết thành công!');
    const folderPath = path.substring(0, path.lastIndexOf('/'));
    loadFolderContents(folderPath);
    
  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể lưu bài viết'}`);
  }
}

// 13. XÓA BÀI VIẾT HOẶC THƯ MỤC
async function deleteItem(path, sha, isFolder) {
  const itemType = isFolder ? 'thư mục' : 'bài viết';
  const confirmMessage = `Bạn có chắc chắn muốn xóa ${itemType} này không?`;
  
  if (!confirm(confirmMessage)) {
    return;
  }
  
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    if (isFolder) {
      // Xóa thư mục (cần tải và xóa từng file trong thư mục)
      await deleteFolderRecursive(path, user.token.access_token);
    } else {
      // Xóa file
      const deleteData = {
        message: `Xóa ${itemType}: ${path}`,
        sha: sha,
        branch: 'main' // Hoặc branch mặc định của bạn
      };
      
      const response = await fetch(`/.netlify/git/github/contents/${path}`, {
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
    
    // Tải lại dữ liệu thư mục
    alert(`Xóa ${itemType} thành công!`);
    const parentFolder = path.split('/').slice(0, -1).join('/');
    loadFolderContents(parentFolder || 'content');
    
  } catch (error) {
    console.error(`Lỗi khi xóa ${itemType}:`, error);
    alert(`Lỗi: ${error.message || `Không thể xóa ${itemType}`}`);
  }
}

// 14. XÓA THƯ MỤC ĐỆ QUY
async function deleteFolderRecursive(folderPath, token) {
  try {
    // Tải nội dung thư mục
    const response = await fetch(`/.netlify/git/github/contents/${folderPath}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Không thể tải nội dung thư mục: ${response.status}`);
    }
    
    const items = await response.json();
    
    // Xóa từng item trong thư mục
    for (const item of items) {
      if (item.type === 'dir') {
        // Đệ quy xóa thư mục con
        await deleteFolderRecursive(item.path, token);
      } else {
        // Xóa file
        const deleteData = {
          message: `Xóa file: ${item.path}`,
          sha: item.sha,
          branch: 'main'
        };
        
        const deleteResponse = await fetch(`/.netlify/git/github/contents/${item.path}`, {
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
    
    console.log(`Đã xóa tất cả nội dung trong thư mục: ${folderPath}`);
    
  } catch (error) {
    console.error('Lỗi khi xóa thư mục đệ quy:', error);
    throw error;
  }
}

// 15. THÊM BÀI VIẾT MỚI
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
        <button onclick="createNewPost('${folderPath}')">Tạo</button>
        <button onclick="document.getElementById('create-modal').style.display='none'">Hủy</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
}

// 16. TẠO BÀI VIẾT MỚI
async function createNewPost(folderPath) {
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    const titleInput = document.getElementById('new-title');
    const contentTextarea = document.getElementById('new-content');
    
    if (!titleInput || !contentTextarea) {
      throw new Error('Không tìm thấy form tạo bài viết');
    }
    
    const title = titleInput.value.trim();
    const content = contentTextarea.value;
    
    if (!title) {
      alert('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    
    // Chuẩn bị tên file
    const filename = title.toLowerCase()
      .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
      .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
      .replace(/[ìíịỉĩ]/g, 'i')
      .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
      .replace(/[ùúụủũưừứựửữ]/g, 'u')
      .replace(/[ỳýỵỷỹ]/g, 'y')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    const path = `${folderPath}/${filename}.md`;
    
    // Chuẩn bị dữ liệu tạo mới
    const createData = {
      message: `Tạo bài viết mới: ${title}`,
      content: btoa(content), // Mã hóa nội dung thành Base64
      branch: 'main' // Hoặc branch mặc định của bạn
    };
    
    // Gửi yêu cầu tạo mới
    const response = await fetch(`/.netlify/git/github/contents/${path}`, {
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
    
    // Đóng modal
    document.getElementById('create-modal').style.display = 'none';
    
    // Tải lại dữ liệu thư mục hiện tại
    alert('Tạo bài viết thành công!');
    loadFolderContents(folderPath);
    
  } catch (error) {
    console.error('Lỗi khi tạo bài viết mới:', error);
    alert(`Lỗi: ${error.message || 'Không thể tạo bài viết mới'}`);
  }
}

// 17. THÊM THƯ MỤC MỚI
function addNewFolder(parentPath) {
  const folderName = prompt('Nhập tên thư mục mới:');
  
  if (!folderName || !folderName.trim()) {
    return;
  }
  
  // Chuẩn bị tên thư mục
  const formattedName = folderName.trim()
    .toLowerCase()
    .replace(/[àáạảãâầấậẩẫăằắặẳẵ]/g, 'a')
    .replace(/[èéẹẻẽêềếệểễ]/g, 'e')
    .replace(/[ìíịỉĩ]/g, 'i')
    .replace(/[òóọỏõôồốộổỗơờớợởỡ]/g, 'o')
    .replace(/[ùúụủũưừứựửữ]/g, 'u')
    .replace(/[ỳýỵỷỹ]/g, 'y')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
    
  // Tạo thư mục mới bằng cách tạo file README.md trong thư mục đó
  const path = `${parentPath}/${formattedName}/README.md`;
  
  createNewPost(path, `# ${folderName}\n\nThư mục này chứa nội dung về ${folderName}.`);
}

// 18. TẠO BÀI VIẾT MỚI (PHIÊN BẢN MỞ RỘNG)
async function createNewPost(path, defaultContent = '') {
  try {
    const user = window.netlifyIdentity.currentUser();
    if (!user || !user.token || !user.token.access_token) {
      throw new Error('Bạn cần đăng nhập lại');
    }
    
    // Nếu không phải là mode tạo thư mục
    if (!defaultContent) {
      const titleInput = document.getElementById('new-title');
      const contentTextarea = document.getElementById('new-content');
      
      if (!titleInput || !contentTextarea) {
        throw new Error('Không tìm thấy form tạo bài viết');
      }
      
      const title = titleInput.value.trim();
      defaultContent = contentTextarea.value;
      
      if (!title) {
        alert('Vui lòng nhập tiêu đề bài viết');
        return;
      }
    }
    
    // Chuẩn bị dữ liệu tạo mới
    const createData = {
      message: `Tạo nội dung mới tại: ${path}`,
      content: btoa(defaultContent), // Mã hóa nội dung thành Base64
      branch: 'main' // Hoặc branch mặc định của bạn
    };
    
    // Gửi yêu cầu tạo mới
    const response = await fetch(`/.netlify/git/github/contents/${path}`, {
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
    
    // Tải lại dữ liệu thư mục cha
    const parentFolder = path.split('/').slice(0, -1).join('/');
    if (!defaultContent) { // Nếu không phải là mode tạo thư mục
      alert('Tạo nội dung thành công!');
    }
    loadFolderContents(parentFolder || 'content');
    
  } catch (error) {
    console.error('Lỗi khi tạo nội dung mới:', error);
    alert(`Lỗi: ${error.message || 'Không thể tạo nội dung mới'}`);
  }
}

// Đăng ký các hàm toàn cục
window.loadFolderContents = loadFolderContents;
window.editPost = editPost;
window.deleteItem = deleteItem;
window.viewPost = viewPost;
window.createNewPost = createNewPost;
window.addNewPost = addNewPost;
window.addNewFolder = addNewFolder;