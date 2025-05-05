// COMPLETE CMS ADMIN SCRIPT WITH FULL UI
document.addEventListener('DOMContentLoaded', function() {
  // CORE CONFIG
  const BASE_URL = window.location.origin;
  const API_BASE = '/.netlify/git/github/contents';
  const CONTENT_ROOT = 'content';
  
  // STATE MANAGEMENT
  let configFields = {};
  let currentFolder = CONTENT_ROOT;
  let currentPosts = [];
  let isProcessing = false;

  // 1. NETLIFY IDENTITY INIT
  if (window.netlifyIdentity) {
    netlifyIdentity.init({ 
      APIUrl: 'https://storeios.net/.netlify/identity',
      enableOperator: true
    });

    const updateUI = (user) => {
      const loginBtn = document.getElementById('login-btn');
      const dashboard = document.getElementById('dashboard');
      const contentUI = document.getElementById('content-ui');
      
      if (user) {
        loginBtn.textContent = `Logout (${user.email})`;
        loginBtn.className = 'logout-btn';
        dashboard.style.display = 'block';
        contentUI.style.display = 'block';
        initCMS();
      } else {
        loginBtn.textContent = 'Login';
        loginBtn.className = 'login-btn';
        dashboard.style.display = 'none';
        contentUI.style.display = 'none';
      }
    };

    netlifyIdentity.on('init', user => updateUI(user));
    netlifyIdentity.on('login', user => {
      updateUI(user);
      netlifyIdentity.close();
    });
    netlifyIdentity.on('logout', () => updateUI(null));

    document.getElementById('login-btn').addEventListener('click', () => {
      netlifyIdentity.currentUser() ? netlifyIdentity.logout() : netlifyIdentity.open();
    });
  }

  // 2. FULL CMS INTERFACE
  async function initCMS() {
    try {
      // Load config and initial folder
      configFields = await loadConfig();
      await loadFolder(currentFolder);
      
      // Setup event listeners
      document.getElementById('add-post').addEventListener('click', () => showPostModal());
      document.getElementById('add-folder').addEventListener('click', () => createFolder());
      document.getElementById('refresh').addEventListener('click', () => loadFolder(currentFolder));
      
    } catch (error) {
      console.error("CMS Init Error:", error);
      showAlert("Khởi tạo hệ thống thất bại", "error");
    }
  }

  // 3. FOLDER AND POST MANAGEMENT
  async function loadFolder(path) {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      document.getElementById('loading').style.display = 'block';
      document.getElementById('content-list').innerHTML = '';
      
      const response = await fetch(`${API_BASE}/${encodeURIComponent(path)}`, {
        headers: getAuthHeaders()
      });
      const data = await response.json();
      
      currentPosts = Array.isArray(data) ? data : [data];
      renderFolderContent(currentPosts, path);
      updateBreadcrumb(path);
      
    } catch (error) {
      showAlert(`Lỗi tải thư mục: ${error.message}`, "error");
    } finally {
      document.getElementById('loading').style.display = 'none';
      isProcessing = false;
    }
  }

  function renderFolderContent(items, path) {
    const container = document.getElementById('content-list');
    
    // Render folder header
    container.innerHTML = `
      <div class="folder-header">
        <h3>${path.replace(`${CONTENT_ROOT}/`, '') || 'Root'}</h3>
        <div class="folder-actions">
          <button id="upload-file"><i class="fas fa-upload"></i> Upload</button>
        </div>
      </div>
      <div class="folder-contents">
        ${items.map(item => renderItem(item)).join('')}
      </div>
    `;
    
    // Add event listeners
    container.querySelectorAll('.folder-item').forEach(item => {
      item.addEventListener('click', () => {
        if (item.dataset.type === 'dir') {
          loadFolder(item.dataset.path);
        }
      });
    });
    
    container.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        editPost(btn.dataset.path);
      });
    });
  }

  function renderItem(item) {
    if (item.type === 'dir') {
      return `
        <div class="folder-item" data-type="dir" data-path="${item.path}">
          <i class="fas fa-folder"></i>
          <span>${item.name}</span>
          <div class="item-actions">
            <button class="edit-btn" data-path="${item.path}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" data-path="${item.path}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
    } else {
      return `
        <div class="file-item" data-type="file" data-path="${item.path}">
          <i class="fas fa-file-alt"></i>
          <span>${item.name}</span>
          <div class="item-actions">
            <button class="edit-btn" data-path="${item.path}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" data-path="${item.path}">
              <i class="fas fa-trash"></i>
            </button>
            <button class="view-btn" data-path="${item.path}">
              <i class="fas fa-eye"></i>
            </button>
          </div>
        </div>
      `;
    }
  }

  // 4. POST EDITOR MODAL (FULL IMPLEMENTATION)
  async function showPostModal(path = null) {
    let content = '';
    let frontmatter = {};
    
    if (path) {
      try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(path)}`, {
          headers: getAuthHeaders()
        });
        const data = await response.json();
        const parsed = parseFrontmatter(atob(data.content));
        content = parsed.body;
        frontmatter = parsed.frontmatter;
      } catch (error) {
        showAlert(`Lỗi tải bài viết: ${error.message}`, "error");
        return;
      }
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${path ? 'Chỉnh sửa' : 'Tạo mới'} bài viết</h2>
          <span class="close-btn">&times;</span>
        </div>
        <div class="modal-body">
          <form id="post-form">
            ${Object.entries(configFields).map(([name, field]) => `
              <div class="form-group">
                <label>
                  ${field.label}
                  ${field.required ? '<span class="required">*</span>' : ''}
                </label>
                ${renderFieldInput(name, field, frontmatter[name] || field.default)}
              </div>
            `).join('')}
            <div class="form-group">
              <label>Nội dung <span class="required">*</span></label>
              <textarea id="post-content" required>${content}</textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button id="save-post">Lưu bài viết</button>
          <button id="cancel-btn">Hủy bỏ</button>
        </div>
      </div>
    `;
    
    // Event handlers
    modal.querySelector('.close-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#cancel-btn').addEventListener('click', () => modal.remove());
    modal.querySelector('#save-post').addEventListener('click', async () => {
      await savePost(path, modal);
    });
    
    document.body.appendChild(modal);
  }

  // ... [Previous helper functions remain unchanged] ...

  // UTILITY FUNCTIONS
  function getAuthHeaders() {
    return {
      'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 3000);
  }

  // INITIALIZE ON LOAD
  if (netlifyIdentity.currentUser()) {
    initCMS();
  }
});

// COMPLETE CSS FOR CMS
const style = document.createElement('style');
style.textContent = `
  /* Main Dashboard Styles */
  #dashboard {
    display: none;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }
  
  #content-ui {
    display: none;
    padding: 20px;
    background: #f5f5f5;
    border-radius: 8px;
    margin-top: 20px;
  }
  
  /* Toolbar Styles */
  .toolbar {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
  }
  
  .toolbar button {
    padding: 8px 16px;
    background: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  /* Folder/File List Styles */
  .folder-contents {
    background: white;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  
  .folder-item, .file-item {
    display: flex;
    align-items: center;
    padding: 10px 15px;
    border-bottom: 1px solid #eee;
    cursor: pointer;
  }
  
  .folder-item:hover, .file-item:hover {
    background: #f9f9f9;
  }
  
  .folder-item i, .file-item i {
    margin-right: 10px;
    width: 20px;
    color: #555;
  }
  
  /* Modal Styles */
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }
  
  .modal-content {
    background: white;
    width: 90%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
  }
  
  /* Form Styles */
  .form-group {
    margin-bottom: 15px;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
  }
  
  .required {
    color: #e53935;
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .modal-content {
      width: 95%;
    }
  }
`;
document.head.appendChild(style);