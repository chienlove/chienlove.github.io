// cms-admin.js - Phiên bản hoàn thiện
document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = 'content';
  let isProcessing = false;
  let collectionsConfig = null;
  let currentCollection = null;

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
      const sidebar = document.getElementById('sidebar');
      
      if (user) {
        console.log('Đã đăng nhập:', user.email);
        loginBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <span>Đăng xuất (${user.email.split('@')[0]})</span>`;
        loginBtn.style.backgroundColor = '#f44336';
        dashboard.style.display = 'block';
        sidebar.style.display = 'block';
        
        // Tải cấu hình CMS khi đăng nhập thành công
        loadCMSConfig().then(() => {
          updateSidebar();
          loadFolderContents(currentFolder);
        });
      } else {
        console.log('Chưa đăng nhập');
        loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> <span>Đăng nhập</span>`;
        loginBtn.style.backgroundColor = '#4cc9f0';
        dashboard.style.display = 'none';
        sidebar.style.display = 'none';
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

  // 4. TẢI CẤU HÌNH CMS
  async function loadCMSConfig() {
    try {
      const configResponse = await callGitHubAPI('/.netlify/git/github/contents/static/admin/config.yml');
      const configContent = atob(configResponse.content);
      collectionsConfig = parseYAML(configContent).collections;
      console.log('Đã tải cấu hình CMS:', collectionsConfig);
      return collectionsConfig;
    } catch (error) {
      console.error('Lỗi khi tải cấu hình CMS:', error);
      showNotification('Lỗi tải cấu hình CMS', 'error');
      return null;
    }
  }

  // 5. PHÂN TÍCH YAML
  function parseYAML(yamlString) {
    const result = { collections: [] };
    const lines = yamlString.split('\n');
    let currentCollection = null;
    let currentField = null;
    let inFields = false;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine === '' || trimmedLine.startsWith('#')) continue;
      
      if (trimmedLine === 'collections:') {
        continue;
      }
      
      if (trimmedLine.startsWith('- name:')) {
        currentCollection = { fields: [] };
        result.collections.push(currentCollection);
        currentCollection.name = trimmedLine.split('name:')[1].trim().replace(/['"]/g, '');
        continue;
      }
      
      if (currentCollection && trimmedLine.startsWith('label:')) {
        currentCollection.label = trimmedLine.split('label:')[1].trim().replace(/['"]/g, '');
        continue;
      }
      
      if (currentCollection && trimmedLine.startsWith('folder:')) {
        currentCollection.folder = trimmedLine.split('folder:')[1].trim().replace(/['"]/g, '');
        continue;
      }
      
      if (currentCollection && trimmedLine === 'fields:') {
        inFields = true;
        continue;
      }
      
      if (inFields && trimmedLine.startsWith('- {')) {
        const fieldStr = trimmedLine.match(/\{([^}]+)\}/)[1];
        const fieldParts = fieldStr.split(',');
        const field = {};
        
        fieldParts.forEach(part => {
          const [key, value] = part.split(':').map(s => s.trim());
          if (key && value) {
            field[key.replace(/['"]/g, '')] = value.replace(/['"]/g, '');
          }
        });
        
        if (field.name) {
          currentCollection.fields.push(field);
        }
      }
    }
    
    return result;
  }

  // 6. CẬP NHẬT SIDEBAR THEO COLLECTION
  function updateSidebar() {
    const sidebarMenu = document.getElementById('sidebar-menu');
    if (!sidebarMenu || !collectionsConfig) return;
    
    let menuHTML = `
      <li class="menu-item" data-folder="content">
        <a href="#" onclick="window.loadFolderContents('content'); return false;">
          <i class="fas fa-home"></i>
          <span>Trang chủ</span>
        </a>
      </li>
    `;
    
    collectionsConfig.forEach(collection => {
      const folder = collection.folder || '';
      menuHTML += `
        <li class="menu-item" data-folder="${escapeHtml(folder)}" data-collection="${escapeHtml(collection.name)}">
          <a href="#" onclick="window.loadCollection('${escapeHtml(collection.name)}', '${escapeHtml(folder)}'); return false;">
            <i class="fas fa-${getCollectionIcon(collection.name)}"></i>
            <span>${escapeHtml(collection.label || collection.name)}</span>
          </a>
        </li>
      `;
    });
    
    menuHTML += `
      <li class="menu-item">
        <a href="#" onclick="window.showSettings(); return false;">
          <i class="fas fa-cog"></i>
          <span>Cài đặt</span>
        </a>
      </li>
    `;
    
    sidebarMenu.innerHTML = menuHTML;
    
    // Đánh dấu menu active
    const menuItems = sidebarMenu.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', function() {
        menuItems.forEach(i => i.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  // 7. HÀM GỌI API AN TOÀN
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

  // 8. TẢI NỘI DUNG COLLECTION
  async function loadCollection(collectionName, folderPath) {
    if (isProcessing) return;
    isProcessing = true;
    
    currentCollection = collectionsConfig.find(c => c.name === collectionName);
    currentFolder = folderPath;
    const postsList = document.getElementById('posts-list');
    const contentHeader = document.querySelector('.content-header h2');
    const createBtn = document.getElementById('create-post');
    
    if (contentHeader && currentCollection) {
      contentHeader.innerHTML = `<i class="fas fa-${getCollectionIcon(collectionName)}"></i> ${escapeHtml(currentCollection.label || currentCollection.name)}`;
    }
    
    if (createBtn) {
      createBtn.style.display = 'inline-flex';
      createBtn.onclick = () => addNewEntry(collectionName);
    }
    
    postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    
    try {
      const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(folderPath)}`);
      console.log('Dữ liệu collection:', data);
      
      allPosts = Array.isArray(data) ? data : [data];
      renderCollectionItems(allPosts, currentCollection);
      
    } catch (error) {
      console.error('Lỗi tải dữ liệu collection:', error);
      postsList.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Lỗi: ${escapeHtml(error.message || 'Không thể tải dữ liệu')}</p>
          <button class="btn" onclick="window.loadCollection('${escapeHtml(collectionName)}', '${escapeHtml(folderPath)}')">Thử lại</button>
        </div>
      `;
      
      if (error.message.includes('401')) {
        netlifyIdentity.logout();
      }
    } finally {
      isProcessing = false;
    }
  }

  // 9. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(path) {
    if (isProcessing) return;
    isProcessing = true;
    
    currentFolder = path || 'content';
    currentCollection = null;
    const postsList = document.getElementById('posts-list');
    const contentHeader = document.querySelector('.content-header h2');
    const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
    const createBtn = document.getElementById('create-post');
    
    if (contentHeader) {
      contentHeader.innerHTML = `<i class="fas fa-folder-open"></i> Thư mục`;
    }
    
    if (createBtn) {
      createBtn.style.display = 'none';
    }
    
    postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
    updateBreadcrumb(path);

    // Active sidebar menu tương ứng
    const menuItems = document.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
      item.classList.remove('active');
      if (item.dataset.folder === path) {
        item.classList.add('active');
      }
    });

    try {
      if (!isValidPath(path)) {
        throw new Error('Đường dẫn không hợp lệ');
      }

      const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
      console.log('Dữ liệu thư mục:', data);

      allPosts = Array.isArray(data) ? data : [data];
      renderFolderContents(allPosts, path);

    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
      postsList.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Lỗi: ${escapeHtml(error.message || 'Không thể tải dữ liệu')}</p>
          <button class="btn" onclick="window.loadFolderContents('${escapeHtml(path)}')">Thử lại</button>
        </div>
      `;
      
      if (error.message.includes('401')) {
        netlifyIdentity.logout();
      }
    } finally {
      isProcessing = false;
    }
  }

  // 10. TẠO BREADCRUMB
  function createBreadcrumb() {
    const dashboard = document.getElementById('dashboard');
    const breadcrumb = document.createElement('div');
    breadcrumb.id = 'breadcrumb';
    breadcrumb.className = 'breadcrumb';
    dashboard.insertBefore(breadcrumb, dashboard.querySelector('.content-body'));
    return breadcrumb;
  }

  // 11. CẬP NHẬT BREADCRUMB
  function updateBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    if (!breadcrumb) return;

    const parts = path.split('/');
    
    let breadcrumbHTML = `<span class="crumb" onclick="window.loadFolderContents('content')">Trang chủ</span>`;
    let currentPath = 'content';
    
    for (let i = 1; i < parts.length; i++) {
      currentPath += '/' + parts[i];
      breadcrumbHTML += ` <i class="fas fa-chevron-right separator"></i> <span class="crumb" onclick="window.loadFolderContents('${escapeHtml(currentPath)}')">${escapeHtml(parts[i])}</span>`;
    }
    
    breadcrumb.innerHTML = breadcrumbHTML;
  }

  // 12. HIỂN THỊ NỘI DUNG COLLECTION
  function renderCollectionItems(items, collection) {
    const postsList = document.getElementById('posts-list');
    
    if (!items || items.length === 0) {
      postsList.innerHTML = `
        <div class="empty">
          <i class="fas fa-inbox"></i>
          <p>Chưa có bài viết nào</p>
          <button class="btn btn-primary" onclick="window.addNewEntry('${escapeHtml(collection.name)}')">
            <i class="fas fa-plus"></i> Thêm bài viết mới
          </button>
        </div>
      `;
      return;
    }
    
    const markdownFiles = items.filter(item => item.name.toLowerCase().endsWith('.md'));
    
    if (markdownFiles.length === 0) {
      postsList.innerHTML = `
        <div class="empty">
          <i class="fas fa-inbox"></i>
          <p>Chưa có bài viết nào</p>
          <button class="btn btn-primary" onclick="window.addNewEntry('${escapeHtml(collection.name)}')">
            <i class="fas fa-plus"></i> Thêm bài viết mới
          </button>
        </div>
      `;
      return;
    }
    
    postsList.innerHTML = `
      <div class="collection-header">
        <div class="search-box">
          <input type="text" id="search-input" placeholder="Tìm kiếm..." />
          <i class="fas fa-search"></i>
        </div>
        <button class="btn btn-primary" onclick="window.addNewEntry('${escapeHtml(collection.name)}')">
          <i class="fas fa-plus"></i> Thêm mới
        </button>
      </div>
      <div class="post-grid">
        ${markdownFiles.map(file => {
          const fileName = file.name.replace(/\.md$/i, '');
          return `
            <div class="post-card">
              <div class="post-card-header">
                <h3 class="post-title">${escapeHtml(fileName)}</h3>
                <span class="post-date">Cập nhật: ${formatDate(new Date(file.sha))}</span>
              </div>
              <div class="post-card-actions">
                <button class="btn btn-sm btn-edit" onclick="window.editEntry('${escapeHtml(collection.name)}', '${escapeHtml(file.path)}', '${escapeHtml(file.sha)}')">
                  <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn btn-sm btn-view" onclick="window.viewPost('${escapeHtml(file.path)}')">
                  <i class="fas fa-eye"></i> Xem
                </button>
                <button class="btn btn-sm btn-delete" onclick="window.deleteItem('${escapeHtml(file.path)}', '${escapeHtml(file.sha)}', false)">
                  <i class="fas fa-trash"></i> Xóa
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Thêm chức năng tìm kiếm
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const postCards = document.querySelectorAll('.post-card');
        
        postCards.forEach(card => {
          const title = card.querySelector('.post-title').textContent.toLowerCase();
          if (title.includes(searchTerm)) {
            card.style.display = 'flex';
          } else {
            card.style.display = 'none';
          }
        });
      });
    }
  }

  // 13. HIỂN THỊ NỘI DUNG THƯ MỤC
  function renderFolderContents(items, currentPath) {
    const postsList = document.getElementById('posts-list');
    
    if (!items || items.length === 0) {
      postsList.innerHTML = `
        <div class="empty">
          <i class="fas fa-inbox"></i>
          <p>Thư mục trống</p>
          <div class="empty-actions">
            <button class="btn btn-primary" onclick="window.addNewPost('${escapeHtml(currentPath)}')">
              <i class="fas fa-file"></i> Thêm bài viết
            </button>
            <button class="btn" onclick="window.addNewFolder('${escapeHtml(currentPath)}')">
              <i class="fas fa-folder-plus"></i> Thêm thư mục
            </button>
          </div>
        </div>
      `;
      return;
    }
    
    const sortedItems = [...items].sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'dir' ? -1 : 1;
    });
    
    postsList.innerHTML = `
      <div class="folder-header">
        <div class="folder-path">
          <i class="fas fa-folder-open"></i> ${escapeHtml(currentPath)}
        </div>
        <div class="folder-actions">
          <button class="btn btn-primary" onclick="window.addNewPost('${escapeHtml(currentPath)}')">
            <i class="fas fa-file"></i> Thêm bài viết
          </button>
          <button class="btn" onclick="window.addNewFolder('${escapeHtml(currentPath)}')">
            <i class="fas fa-folder-plus"></i> Thêm thư mục
          </button>
        </div>
      </div>
      <div class="content-grid">
        ${sortedItems.map(item => {
          if (item.type === 'dir') {
            return `
              <div class="folder-item">
                <div class="folder-item-inner" onclick="window.loadFolderContents('${escapeHtml(item.path)}')">
                  <div class="folder-icon">
                    <i class="fas fa-folder"></i>
                  </div>
                  <div class="folder-details">
                    <span class="folder-name">${escapeHtml(item.name)}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="btn btn-sm btn-delete" onclick="event.stopPropagation(); window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', true)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `;
          } else {
            if (!item.name.toLowerCase().endsWith('.md')) return '';
            
            return `
              <div class="file-item">
                <div class="file-item-inner">
                  <div class="file-icon">
                    <i class="fas fa-file-alt"></i>
                  </div>
                  <div class="file-details">
                    <span class="file-name">${escapeHtml(item.name.replace(/\.md$/i, ''))}</span>
                    <span class="file-date">Cập nhật: ${formatDate(new Date(item.sha))}</span>
                  </div>
                </div>
                <div class="item-actions">
                  <button class="btn btn-sm btn-edit" onclick="window.editPost('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}')">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-view" onclick="window.viewPost('${escapeHtml(item.path)}')">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-delete" onclick="window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', false)">
                    <i class="fas fa-trash"></i>
                  </button>
                </div>
              </div>
            `;
          }
        }).join('')}
      </div>
    `;
  }

  // 14. THÊM BÀI VIẾT MỚI - THƯ MỤC THÔNG THƯỜNG
  function addNewPost(folderPath) {
    showModal({
      title: 'Tạo bài viết mới',
      confirmText: 'Tạo',
      body: `
        <div class="form-group">
          <label for="new-title">Tiêu đề:</label>
          <input type="text" id="new-title" placeholder="Nhập tiêu đề bài viết" class="form-control" />
        </div>
        <div class="form-group">
          <label for="new-content">Nội dung:</label>
          <textarea id="new-content" rows="15" placeholder="Nội dung bài viết (Markdown)" class="form-control"></textarea>
        </div>
      `,
      onConfirm: () => {
        const title = document.getElementById('new-title').value.trim();
        const content = document.getElementById('new-content').value;
        
        if (!title) {
          showNotification('Vui lòng nhập tiêu đề bài viết', 'warning');
          return false;
        }
        
        const filename = formatFolderName(title) + '.md';
        const path = `${folderPath}/${filename}`;
        
        createNewPost(path, `# ${title}\n\n${content}`);
        return true;
      }
    });
  }

  // 15. THÊM ENTRY MỚI CHO COLLECTION
  function addNewEntry(collectionName) {
    const collection = collectionsConfig.find(c => c.name === collectionName);
    if (!collection) {
      showNotification('Không tìm thấy cấu hình collection', 'error');
      return;
    }
    
    const fields = collection.fields || [];
    let formHTML = '';
    
    // Tạo frontmatter mặc định
    let defaultFrontMatter = {
      title: '',
      date: new Date().toISOString().split('T')[0]
    };
    
    // Tạo form
    fields.forEach(field => {
      if (!field.name || !field.label) return;
      
      // Bỏ qua trường body vì sẽ xử lý riêng
      if (field.name === 'body') return;
      
      // Thêm giá trị mặc định
      if (field.default) {
        defaultFrontMatter[field.name] = field.default;
      }
      
      formHTML += `<div class="form-group">`;
      
      switch (field.widget) {
        case 'datetime':
          formHTML += `
            <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
            <input type="date" id="field-${field.name}" class="form-control" value="${defaultFrontMatter[field.name] || ''}">
          `;
          break;
          
        case 'select':
          formHTML += `
            <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
            <select id="field-${field.name}" class="form-control">
              ${(field.options || []).map(option => 
                `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`
              ).join('')}
            </select>
          `;
          break;
          
        case 'text':
        case 'string':
          formHTML += `
            <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
            <input type="text" id="field-${field.name}" class="form-control" value="${defaultFrontMatter[field.name] || ''}">
          `;
          break;
          
        case 'textarea':
          formHTML += `
            <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
            <textarea id="field-${field.name}" class="form-control" rows="4">${defaultFrontMatter[field.name] || ''}</textarea>
          `;
          break;
          
        default:
          formHTML += `
            <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
            <input type="text" id="field-${field.name}" class="form-control" value="${defaultFrontMatter[field.name] || ''}">
          `;
      }
      
      formHTML += `</div>`;
    });
    
    // Thêm trường nội dung chính (body)
    formHTML += `
      <div class="form-group">
        <label for="field-body">Nội dung:</label>
        <textarea id="field-body" rows="15" class="form-control" placeholder="Nội dung chính (Markdown)"></textarea>
      </div>
    `;
    
    showModal({
      title: `Thêm mới ${collection.label || collection.name}`,
      confirmText: 'Tạo',
      body: formHTML,
      onConfirm: () => {
        const title = document.getElementById('field-title')?.value.trim() || '';
        if (!title) {
          showNotification('Vui lòng nhập tiêu đề', 'warning');
          return false;
        }
        
        const filename = formatFolderName(title) + '.md';
        const path = `${collection.folder}/${filename}`;
        
        // Thu thập dữ liệu từ form
        const frontMatter = {};
        fields.forEach(field => {
          if (field.name === 'body') return;
          const value = document.getElementById(`field-${field.name}`)?.value;
          if (value !== undefined) {
            frontMatter[field.name] = value;
          }
        });
        
        const body = document.getElementById('field-body')?.value || '';
        
        // Tạo nội dung file markdown với frontmatter
        const content = `---
${Object.entries(frontMatter).map(([key, value]) => `${key}: ${value}`).join('\n')}
---

${body}
`;
        
        createNewPost(path, content);
        return true;
      }
    });
  }

  // 16. HIỂN THỊ MODAL
  function showModal({ title, body, confirmText = 'Lưu', onConfirm }) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <span class="close-btn">&times;</span>
        </div>
        <div class="modal-body">
          ${body}
        </div>
        <div class="modal-footer">
          <button class="btn" id="modal-cancel">Hủy</button>
          <button class="btn btn-primary" id="modal-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Xử lý sự kiện
    modal.querySelector('.close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('#modal-cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.querySelector('#modal-confirm').addEventListener('click', () => {
      if (onConfirm && onConfirm() !== false) {
        modal.remove();
      }
    });
    
    // Đóng modal khi click ra ngoài
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  // 17. HIỂN THỊ THÔNG BÁO
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }

  // 18. ĐỊNH DẠNG NGÀY THÁNG
  function formatDate(date) {
    if (!(date instanceof Date)) return '';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // 19. LẤY ICON CHO COLLECTION
  function getCollectionIcon(collectionName) {
    const icons = {
      posts: 'file-alt',
      pages: 'file',
      products: 'shopping-bag',
      categories: 'tags',
      settings: 'cog',
      users: 'users'
    };
    
    return icons[collectionName] || 'file';
  }

  // 20. KIỂM TRA ĐƯỜNG DẪN HỢP LỆ
  function isValidPath(path) {
    return path && !path.includes('../') && !path.startsWith('/') && !path.includes('//');
  }

  // 21. ESCAPE HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 22. ĐỊNH DẠNG TÊN THƯ MỤC
  function formatFolderName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  // Đăng ký hàm toàn cục
  window.loadFolderContents = loadFolderContents;
  window.loadCollection = loadCollection;
  window.editPost = editPost;
  window.editEntry = editPost; // Alias cho collection
  window.deleteItem = deleteItem;
  window.viewPost = viewPost;
  window.createNewPost = createNewPost;
  window.addNewPost = addNewPost;
  window.addNewFolder = addNewFolder;
  window.addNewEntry = addNewEntry;
  window.showSettings = () => showNotification('Tính năng đang phát triển', 'warning');
});

// 23. CHỨC NĂNG XEM BÀI VIẾT
function viewPost(path) {
  const slug = path.replace(/^content\//, '').replace(/\.md$/i, '');
  const baseURL = window.location.origin;
  const postUrl = `${baseURL}/${slug}`;
  window.open(postUrl, '_blank');
}

// 24. CHỈNH SỬA BÀI VIẾT
async function editPost(path, sha) {
  try {
    const encodedPath = encodeURIComponent(path);
    const fileData = await callGitHubAPI(`/.netlify/git/github/contents/${encodedPath}`);
    const content = atob(fileData.content);
    
    // Kiểm tra xem có phải là collection entry (có frontmatter)
    if (content.startsWith('---')) {
      const frontMatterEnd = content.indexOf('---', 3);
      const frontMatter = content.substring(3, frontMatterEnd).trim();
      const body = content.substring(frontMatterEnd + 3).trim();
      
      // Parse frontmatter đơn giản
      const fields = {};
      frontMatter.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length > 0) {
          fields[key.trim()] = valueParts.join(':').trim();
        }
      });
      
      // Tìm collection tương ứng
      const collection = window.collectionsConfig?.find(c => path.startsWith(c.folder));
      
      if (collection) {
        showEditCollectionModal(collection, path, sha, fields, body);
        return;
      }
    }
    
    // Nếu không phải collection entry, hiển thị editor đơn giản
    showEditModal(path, content, sha);
  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    showNotification(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`, 'error');
  }
}

// 25. HIỂN THỊ MODAL CHỈNH SỬA COLLECTION ENTRY
function showEditCollectionModal(collection, path, sha, fields, body) {
  let formHTML = '';
  
  collection.fields.forEach(field => {
    if (!field.name || !field.label) return;
    if (field.name === 'body') return;
    
    const value = fields[field.name] || '';
    
    formHTML += `<div class="form-group">`;
    
    switch (field.widget) {
      case 'datetime':
        formHTML += `
          <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
          <input type="date" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}">
        `;
        break;
        
      case 'select':
        formHTML += `
          <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
          <select id="field-${field.name}" class="form-control">
            ${(field.options || []).map(option => 
              `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`
            ).join('')}
          </select>
        `;
        break;
        
      case 'text':
      case 'string':
        formHTML += `
          <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
          <input type="text" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}">
        `;
        break;
        
      case 'textarea':
        formHTML += `
          <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
          <textarea id="field-${field.name}" class="form-control" rows="4">${escapeHtml(value)}</textarea>
        `;
        break;
        
      default:
        formHTML += `
          <label for="field-${field.name}">${escapeHtml(field.label)}:</label>
          <input type="text" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}">
        `;
    }
    
    formHTML += `</div>`;
  });
  
  // Thêm trường nội dung chính (body)
  formHTML += `
    <div class="form-group">
      <label for="field-body">Nội dung:</label>
      <textarea id="field-body" rows="15" class="form-control">${escapeHtml(body)}</textarea>
    </div>
  `;
  
  showModal({
    title: `Chỉnh sửa ${collection.label || collection.name}`,
    confirmText: 'Lưu',
    body: formHTML,
    onConfirm: () => {
      const title = document.getElementById('field-title')?.value.trim() || '';
      if (!title) {
        showNotification('Vui lòng nhập tiêu đề', 'warning');
        return false;
      }
      
      // Thu thập dữ liệu từ form
      const frontMatter = {};
      collection.fields.forEach(field => {
        if (field.name === 'body') return;
        const value = document.getElementById(`field-${field.name}`)?.value;
        if (value !== undefined) {
          frontMatter[field.name] = value;
        }
      });
      
      const newBody = document.getElementById('field-body')?.value || '';
      
      // Tạo nội dung file markdown với frontmatter
      const content = `---
${Object.entries(frontMatter).map(([key, value]) => `${key}: ${value}`).join('\n')}
---

${newBody}
`;
      
      savePost(path, sha, content, `Cập nhật ${collection.label || collection.name}: ${title}`);
      return true;
    }
  });
}

// 26. HIỂN THỊ MODAL CHỈNH SỬA ĐƠN GIẢN
function showEditModal(path, content, sha) {
  const filename = path.split('/').pop();
  
  showModal({
    title: 'Chỉnh sửa bài viết',
    confirmText: 'Lưu',
    body: `
      <div class="form-group">
        <label for="edit-title">Tiêu đề:</label>
        <input type="text" id="edit-title" class="form-control" value="${escapeHtml(filename.replace(/\.md$/i, ''))}">
      </div>
      <div class="form-group">
        <label for="edit-content">Nội dung:</label>
        <textarea id="edit-content" rows="20" class="form-control">${escapeHtml(content)}</textarea>
      </div>
    `,
    onConfirm: () => {
      const title = document.getElementById('edit-title').value.trim();
      const content = document.getElementById('edit-content').value;
      
      if (!title) {
        showNotification('Vui lòng nhập tiêu đề bài viết', 'warning');
        return false;
      }
      
      const newFilename = formatFolderName(title) + '.md';
      const newPath = path.split('/').slice(0, -1).join('/') + '/' + newFilename;
      
      savePost(newPath, sha, content, `Cập nhật bài viết: ${title}`, path !== newPath);
      return true;
    }
  });
}

// 27. LƯU BÀI VIẾT
async function savePost(path, sha, content, message, isRename = false) {
  try {
    const updateData = {
      message: message,
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha,
      branch: 'main'
    };
    
    let apiPath = path;
    if (isRename) {
      // Nếu đổi tên file, cần gọi API xóa file cũ và tạo file mới
      const oldPath = path.split('/').slice(0, -1).join('/') + '/' + document.getElementById('edit-title').getAttribute('data-oldname');
      await deleteItem(oldPath, sha, false, true);
      apiPath = path;
      delete updateData.sha; // Không cần sha khi tạo file mới
    }
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(apiPath)}`, isRename ? 'PUT' : 'PUT', updateData);
    
    showNotification('Lưu thành công!', 'success');
    const folderPath = path.split('/').slice(0, -1).join('/');
    
    if (currentCollection) {
      window.loadCollection(currentCollection.name, currentCollection.folder);
    } else {
      window.loadFolderContents(folderPath);
    }
    
  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    showNotification(`Lỗi: ${error.message || 'Không thể lưu bài viết'}`, 'error');
  }
}

// 28. XÓA BÀI VIẾT HOẶC THƯ MỤC
async function deleteItem(path, sha, isFolder, silent = false) {
  const itemType = isFolder ? 'thư mục' : 'bài viết';
  if (!silent && !confirm(`Bạn có chắc chắn muốn xóa ${itemType} này không?`)) return;
  
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
    
    if (!silent) {
      showNotification(`Xóa ${itemType} thành công!`, 'success');
    }
    
    const parentFolder = path.split('/').slice(0, -1).join('/');
    
    if (currentCollection) {
      window.loadCollection(currentCollection.name, currentCollection.folder);
    } else {
      window.loadFolderContents(parentFolder || 'content');
    }
    
  } catch (error) {
    console.error(`Lỗi khi xóa ${itemType}:`, error);
    showNotification(`Lỗi: ${error.message || `Không thể xóa ${itemType}`}`, 'error');
  }
}

// 29. XÓA THƯ MỤC ĐỆ QUY
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

// 30. TẠO BÀI VIẾT MỚI
async function createNewPost(path, content) {
  try {
    const createData = {
      message: `Tạo nội dung mới: ${path.split('/').pop().replace(/\.md$/i, '')}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: 'main'
    };
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, 'PUT', createData);
    
    showNotification('Tạo bài viết thành công!', 'success');
    const parentFolder = path.split('/').slice(0, -1).join('/');
    
    if (currentCollection) {
      window.loadCollection(currentCollection.name, currentCollection.folder);
    } else {
      window.loadFolderContents(parentFolder || 'content');
    }
    
  } catch (error) {
    console.error('Lỗi khi tạo nội dung mới:', error);
    showNotification(`Lỗi: ${error.message || 'Không thể tạo nội dung mới'}`, 'error');
  }
}

// 31. THÊM THƯ MỤC MỚI
function addNewFolder(parentPath) {
  showModal({
    title: 'Tạo thư mục mới',
    confirmText: 'Tạo',
    body: `
      <div class="form-group">
        <label for="folder-name">Tên thư mục:</label>
        <input type="text" id="folder-name" placeholder="Nhập tên thư mục" class="form-control" />
      </div>
    `,
    onConfirm: () => {
      const folderName = document.getElementById('folder-name').value.trim();
      if (!folderName) {
        showNotification('Vui lòng nhập tên thư mục', 'warning');
        return false;
      }
      
      const formattedName = formatFolderName(folderName);
      const path = `${parentPath}/${formattedName}/README.md`;
      
      createNewPost(path, `# ${folderName}\n\nThư mục này chứa nội dung về ${folderName}.`);
      return true;
    }
  });
}

// 32. HÀM GỌI API TOÀN CỤC
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