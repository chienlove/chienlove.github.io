// cms-admin.js
document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = 'content';
  let isProcessing = false;
  let configFields = null;
  const BASE_URL = window.location.origin; // Lấy base URL từ trang hiện tại

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
        // Tải config ngay sau khi đăng nhập
        loadConfig().then(fields => {
          configFields = fields;
          console.log('Đã tải config fields:', configFields);
          // Sau khi đã có config, mới tải nội dung thư mục
          loadFolderContents(currentFolder);
        });
      } else {
        console.log('Chưa đăng nhập');
        loginBtn.textContent = 'Đăng nhập';
        loginBtn.style.backgroundColor = '#4CAF50';
        dashboard.style.display = 'none';
        allPosts = [];
        configFields = null;
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
    checkInternetConnection();
    
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

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const errorMessage = error?.message || `Lỗi HTTP ${response.status}`;
        
        if (response.status === 401) {
          netlifyIdentity.logout();
          throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        } else if (response.status === 404) {
          throw new Error('Tài nguyên không tồn tại hoặc đã bị xóa.');
        } else if (response.status === 409) {
          throw new Error('Xung đột dữ liệu. Có thể SHA không còn hợp lệ.');
        }
        
        throw new Error(errorMessage);
      }

      return response.json();
    } catch (error) {
      console.error('Lỗi khi gọi API:', error);
      throw error;
    }
  }

  // 5. TẢI CONFIG.YML
  async function loadConfig() {
    try {
      const config = await callGitHubAPI('/.netlify/git/github/contents/config.yml');
      const content = atob(config.content);
      return parseYamlConfig(content);
    } catch (error) {
      console.error('Lỗi khi tải config.yml:', error);
      return null;
    }
  }

  function parseYamlConfig(yamlContent) {
    try {
      const collectionsMatch = yamlContent.match(/collections:\s*([\s\S]*?)(?=\n\S|$)/);
      if (!collectionsMatch) return null;
      
      const collections = collectionsMatch[1];
      const fields = {};
      
      const fieldsBlockMatch = collections.match(/fields:\s*\n([\s\S]*?)(?=\n[^\s]|$)/);
      if (!fieldsBlockMatch) return null;
      
      const fieldsBlock = fieldsBlockMatch[1];
      const fieldEntries = fieldsBlock.match(/\s*-\s*name:.*?(?=\s*-\s*name:|$)/gs);
      
      if (fieldEntries) {
        fieldEntries.forEach(entry => {
          const nameMatch = entry.match(/name:\s*['"](.*?)['"]/);
          if (nameMatch) {
            const fieldName = nameMatch[1];
            const labelMatch = entry.match(/label:\s*['"](.*?)['"]/);
            const widgetMatch = entry.match(/widget:\s*['"](.*?)['"]/);
            const defaultMatch = entry.match(/default:\s*(['"]?(.*?)['"]?)\s*(?:\n|$)/);
            
            fields[fieldName] = {
              label: labelMatch ? labelMatch[1] : fieldName,
              type: widgetMatch ? widgetMatch[1] : 'string',
              default: defaultMatch ? defaultMatch[2] : ''
            };
          }
        });
      }
      
      return Object.keys(fields).length > 0 ? fields : null;
    } catch (error) {
      console.error('Lỗi phân tích config.yml:', error);
      return null;
    }
  }

  // 6. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(path) {
    if (isProcessing) return;
    isProcessing = true;
    
    currentFolder = path || 'content';
    const postsList = document.getElementById('posts-list');
    const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
    
    postsList.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
    updateBreadcrumb(path);

    try {
      if (!isValidPath(path)) {
        throw new Error('Đường dẫn không hợp lệ');
      }

      const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
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

  // 7. TẠO BREADCRUMB
  function createBreadcrumb() {
    const dashboard = document.getElementById('dashboard');
    const breadcrumb = document.createElement('div');
    breadcrumb.id = 'breadcrumb';
    breadcrumb.className = 'breadcrumb';
    dashboard.insertBefore(breadcrumb, dashboard.firstChild);
    return breadcrumb;
  }

  // 8. CẬP NHẬT BREADCRUMB
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

  // 9. HIỂN THỊ NỘI DUNG THƯ MỤC
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

  // 10. THÊM BÀI VIẾT MỚI
  async function addNewPost(folderPath) {
    if (!configFields) {
      configFields = await loadConfig();
    }
    
    if (!configFields) {
      alert("Không thể tạo bài viết mới vì lỗi tải cấu hình");
      return;
    }
    
    let modal = document.getElementById('create-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'create-modal';
      modal.className = 'modal';
      document.body.appendChild(modal);
    }
    
    const fieldsHtml = configFields ? 
      Object.entries(configFields).map(([name, field]) => `
        <div class="form-group">
          <label for="field-${escapeHtml(name)}">${escapeHtml(field.label || name)}:</label>
          ${getFieldInputHtml(name, field.type, field.default || '')}
        </div>
      `).join('') : '';
    
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
          ${fieldsHtml}
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

  // 11. THÊM THƯ MỤC MỚI
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

  function formatFileName(title) {
    return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  function getFieldInputHtml(name, type, value = '') {
    switch(type) {
      case 'text':
      case 'string':
        return `<input type="text" id="field-${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
      case 'number':
        return `<input type="number" id="field-${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
      case 'boolean':
        return `<input type="checkbox" id="field-${escapeHtml(name)}" ${value === 'true' || value === true ? 'checked' : ''} />`;
      case 'datetime':
        return `<input type="datetime-local" id="field-${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
      case 'select':
        return `<select id="field-${escapeHtml(name)}"></select>`;
      case 'markdown':
        return `<textarea id="field-${escapeHtml(name)}" rows="5">${escapeHtml(value)}</textarea>`;
      default:
        return `<input type="text" id="field-${escapeHtml(name)}" value="${escapeHtml(value)}" />`;
    }
  }

  function parseFrontmatter(content) {
    const frontmatter = {};
    let body = content;
    
    if (content.startsWith('---')) {
      const endFrontmatter = content.indexOf('---', 3);
      if (endFrontmatter > 0) {
        const frontmatterText = content.substring(3, endFrontmatter).trim();
        body = content.substring(endFrontmatter + 3).trim();
        
        frontmatterText.split('\n').forEach(line => {
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            let value = match[2].trim();
            
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.substring(1, value.length - 1);
            }
            
            frontmatter[key] = value;
          }
        });
      }
    }
    
    return { frontmatter, body };
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
          max-height: 90vh;
          overflow-y: auto;
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
        .form-group input[type="text"],
        .form-group input[type="number"],
        .form-group input[type="datetime-local"],
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        .form-group input[type="checkbox"] {
          margin-right: 5px;
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

  function checkInternetConnection() {
    if (!navigator.onLine) {
      throw new Error('Không có kết nối Internet. Vui lòng kiểm tra lại kết nối.');
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
  window.loadConfig = loadConfig;
  window.savePost = savePost;
});

// 12. CHỨC NĂNG XEM BÀI VIẾT (ĐÃ TỐI ƯU CHO STOREIOS.NET)
function viewPost(path) {
  // Xử lý đặc biệt cho storeios.net
  let slug = path.replace('content/', '').replace(/\.md$/i, '');
  
  // Xử lý README.md trong thư mục con
  const parts = slug.split('/');
  if (parts.length > 1 && parts[parts.length-1].toLowerCase() === 'readme') {
    slug = parts.slice(0, -1).join('/');
  }
  
  // Tạo URL hoàn chỉnh
  const postUrl = `${window.location.origin}/${slug}`;
  console.log('Opening post URL:', postUrl);
  window.open(postUrl, '_blank');
}

// 13. CHỨC NĂNG SỬA BÀI VIẾT
async function editPost(path, sha) {
  try {
    console.log("Bắt đầu sửa bài viết:", path);
    
    // Hiển thị loading
    const postsList = document.getElementById('posts-list');
    const originalContent = postsList.innerHTML;
    postsList.innerHTML = '<div class="loading">Đang tải bài viết...</div>';
    
    // Đảm bảo configFields đã được tải
    if (!window.configFields) {
      window.configFields = await window.loadConfig();
      if (!window.configFields) {
        throw new Error('Không thể tải cấu hình bài viết');
      }
    }
    
    const fileData = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
    const content = atob(fileData.content);
    
    showEditModal(path, content, sha);
    
    // Khôi phục nội dung nếu có lỗi
    postsList.innerHTML = originalContent;
  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`);
    
    if (error.message.includes('401') || error.message.includes('Operator')) {
      netlifyIdentity.logout();
    }
  }
}

// 14. HIỂN THỊ MODAL CHỈNH SỬA
async function showEditModal(path, content, sha) {
  let configFields = window.configFields;
  if (!configFields) {
    configFields = await window.loadConfig();
    window.configFields = configFields;
  }
  
  const filename = path.split('/').pop();
  const { frontmatter, body } = parseFrontmatter(content);
  
  const modal = document.getElementById('edit-modal') || document.createElement('div');
  modal.id = 'edit-modal';
  modal.className = 'modal';
  document.body.appendChild(modal);
  
  const fieldsHtml = configFields ? 
    Object.entries(configFields).map(([name, field]) => `
      <div class="form-group">
        <label for="field-${escapeHtml(name)}">${escapeHtml(field.label || name)}:</label>
        ${getFieldInputHtml(name, field.type, frontmatter[name] || field.default || '')}
      </div>
    `).join('') : '';
  
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
        ${fieldsHtml}
        <div class="form-group">
          <label for="edit-content">Nội dung:</label>
          <textarea id="edit-content" rows="20">${escapeHtml(body)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button id="save-post-btn">Lưu</button>
        <button onclick="document.getElementById('edit-modal').style.display='none'">Hủy</button>
      </div>
    </div>
  `;
  
  modal.style.display = 'block';
  
  document.getElementById('save-post-btn').addEventListener('click', () => {
    window.savePost(path, sha);
  });
}

// 15. LƯU BÀI VIẾT
async function savePost(path, sha) {
  try {
    const titleInput = document.getElementById('edit-title');
    const contentTextarea = document.getElementById('edit-content');
    
    if (!titleInput || !contentTextarea) {
      throw new Error('Không tìm thấy form chỉnh sửa');
    }
    
    const title = titleInput.value.trim();
    const bodyContent = contentTextarea.value;
    
    if (!title) {
      alert('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    
    // Lấy giá trị từ các trường config
    const configFields = window.configFields;
    const frontmatter = {};
    
    if (configFields) {
      for (const [name] of Object.entries(configFields)) {
        const input = document.getElementById(`field-${name}`);
        if (input) {
          frontmatter[name] = input.type === 'checkbox' ? input.checked : input.value;
        }
      }
    }
    
    // Tạo nội dung với front matter
    let content = '';
    if (Object.keys(frontmatter).length > 0) {
      content += '---\n';
      for (const [key, value] of Object.entries(frontmatter)) {
        content += `${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
      }
      content += '---\n\n';
    }
    content += bodyContent;
    
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

// 16. TẠO BÀI VIẾT MỚI
async function createNewPost(folderPath) {
  try {
    const titleInput = document.getElementById('new-title');
    const contentTextarea = document.getElementById('new-content');
    
    if (!titleInput || !contentTextarea) {
      throw new Error('Không tìm thấy form tạo bài viết');
    }
    
    const title = titleInput.value.trim();
    const bodyContent = contentTextarea.value;
    
    if (!title) {
      alert('Vui lòng nhập tiêu đề bài viết');
      return;
    }
    
    // Lấy giá trị từ các trường config
    const configFields = window.configFields;
    const frontmatter = {};
    
    if (configFields) {
      for (const [name] of Object.entries(configFields)) {
        const input = document.getElementById(`field-${name}`);
        if (input) {
          frontmatter[name] = input.type === 'checkbox' ? input.checked : input.value;
        }
      }
    }
    
    // Tạo tên file từ tiêu đề
    const fileName = formatFileName(title) + '.md';
    const filePath = `${folderPath}/${fileName}`;
    
    // Tạo nội dung với front matter
    let content = '';
    if (Object.keys(frontmatter).length > 0) {
      content += '---\n';
      for (const [key, value] of Object.entries(frontmatter)) {
        content += `${key}: ${typeof value === 'string' ? `"${value}"` : value}\n`;
      }
      content += '---\n\n';
    }
    content += bodyContent;
    
    const createData = {
      message: `Tạo bài viết mới: ${title}`,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: 'main'
    };
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(filePath)}`, 'PUT', createData);
    
    document.getElementById('create-modal').style.display = 'none';
    alert('Tạo bài viết thành công!');
    window.loadFolderContents(folderPath);
    
  } catch (error) {
    console.error('Lỗi khi tạo bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tạo bài viết'}`);
  }
}

// 17. XÓA BÀI VIẾT/THƯ MỤC
async function deleteItem(path, sha, isFolder) {
  if (!confirm(`Bạn có chắc chắn muốn xóa ${isFolder ? 'thư mục' : 'bài viết'} này?`)) {
    return;
  }
  
  try {
    const deleteData = {
      message: `Xóa ${isFolder ? 'thư mục' : 'bài viết'}: ${path.split('/').pop()}`,
      sha: sha,
      branch: 'main'
    };
    
    await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, 'DELETE', deleteData);
    
    alert(`Xóa ${isFolder ? 'thư mục' : 'bài viết'} thành công!`);
    const folderPath = path.substring(0, path.lastIndexOf('/'));
    window.loadFolderContents(folderPath);
    
  } catch (error) {
    console.error('Lỗi khi xóa:', error);
    alert(`Lỗi: ${error.message || 'Không thể xóa'}`);
  }
}

// Hàm gọi API (được sử dụng bởi các hàm toàn cục)
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

// Hàm escape HTML (được sử dụng bởi các hàm toàn cục)
function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}