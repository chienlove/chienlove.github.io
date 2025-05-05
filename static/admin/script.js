// script.js hoàn thiện
document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo CMS_CONFIG từ config.yml
  window.CMS_CONFIG = {
    collections: [
      {
        name: "posts",
        label: "Bài viết",
        fields: [
          {label: "Tiêu đề", name: "title", widget: "string", required: true},
          {label: "Ngày đăng", name: "date", widget: "datetime", format: "YYYY-MM-DD", date_format: "DD/MM/YYYY", time_format: false},
          {label: "Tác giả", name: "author", widget: "string", default: "Admin"},
          {label: "Hình ảnh đại diện", name: "thumbnail", widget: "image", required: false},
          {label: "Mô tả ngắn", name: "description", widget: "text", required: false},
          {label: "Nội dung", name: "body", widget: "markdown"},
          {label: "Thẻ", name: "tags", widget: "list", required: false},
          {label: "Chuyên mục", name: "categories", widget: "list", required: false}
        ]
      },
      {
        name: "app",
        label: "Ứng dụng",
        fields: [
          {label: "Tên ứng dụng", name: "title", widget: "string", required: true},
          {label: "Ngày đăng", name: "date", widget: "datetime", required: true},
          {label: "Ảnh icon", name: "icon", widget: "image", required: true},
          {label: "Ảnh screenshot", name: "screenshots", widget: "list", field: {label: "Ảnh", name: "image", widget: "image"}, required: false},
          {label: "Mô tả ngắn", name: "short_description", widget: "text", required: false},
          {label: "Mô tả chi tiết", name: "description", widget: "markdown", required: true},
          {label: "Nhà phát triển", name: "developer", widget: "string", required: true},
          {label: "Thể loại", name: "category", widget: "select", options: ["Ứng dụng", "Games", "Tool jailbreak", "Thủ thuật", "File ipa", "Khác"], required: true},
          {label: "Phiên bản", name: "version", widget: "string", required: true},
          {label: "Kích thước", name: "size", widget: "string", required: true},
          {label: "iOS tương thích", name: "requirements", widget: "string", required: true},
          {label: "Ngôn ngữ hỗ trợ", name: "languages", widget: "list", required: true},
          {label: "Liên kết tải App Store", name: "app_store_link", widget: "string", required: true},
          {label: "Từ khóa", name: "tags", widget: "list", required: false}
        ]
      },
      {
        name: "jailbreak-tools",
        label: "Tool Jailbreak",
        fields: [
          {label: "Tên Tool", name: "title", widget: "string", required: true},
          {label: "Ngày đăng", name: "date", widget: "datetime", required: true},
          {label: "Icon", name: "icon", widget: "image", required: true},
          {label: "Ảnh màn hình", name: "screenshots", widget: "list", field: {label: "Ảnh", name: "image", widget: "image"}, required: false},
          {label: "Mô tả ngắn", name: "short_description", widget: "text", required: false},
          {label: "Mô tả chi tiết", name: "description", widget: "markdown", required: true},
          {label: "Nhà phát triển", name: "developer", widget: "string", required: true},
          {label: "Thể loại", name: "categories", widget: "string", required: true},
          {label: "Kích thước", name: "size", widget: "update-size", required: false},
          {label: "iOS tương thích", name: "ios_compatible", widget: "string", required: true},
          {label: "Từ khóa", name: "keywords", widget: "list", required: false},
          {name: "main_download", label: "Liên kết tải xuống chính", widget: "object", fields: [
            {name: "version", label: "Phiên bản", widget: "string"},
            {name: "appId", label: "App ID", widget: "string"},
            {name: "plistUrl", label: "Plist URL", widget: "string"}
          ]},
          {name: "other_versions", label: "Các phiên bản khác", widget: "list", fields: [
            {name: "version", label: "Phiên bản", widget: "string"},
            {name: "appId", label: "App ID", widget: "string"},
            {name: "plistUrl", label: "Plist URL", widget: "string"}
          ]}
        ]
      }
    ]
  };

  // Khởi tạo Netlify Identity
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity',
      enableOperator: true
    });

    const handleAuthChange = (user) => {
      const loginBtn = document.getElementById('login-btn');
      const dashboard = document.getElementById('dashboard');
      
      if (user) {
        loginBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Đăng xuất (${user.email})`;
        loginBtn.style.backgroundColor = '#f44336';
        dashboard.style.display = 'flex';
        loadFolderContents('content');
      } else {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Đăng nhập';
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
    
    document.getElementById('login-btn').addEventListener('click', () => {
      if (netlifyIdentity.currentUser()) {
        netlifyIdentity.logout();
      } else {
        netlifyIdentity.open('login');
      }
    });
  }

  // Thêm sự kiện cho nút tạo bài mới
  document.getElementById('create-post').addEventListener('click', () => {
    addNewPost(currentFolder);
  });

  // Biến toàn cục
  let currentFolder = 'content';
  let isProcessing = false;

  // Đăng ký hàm toàn cục
  window.loadFolderContents = loadFolderContents;
  window.editPost = editPost;
  window.deleteItem = deleteItem;
  window.viewPost = viewPost;
  window.createNewPost = createNewPost;
  window.addNewPost = addNewPost;
  window.addNewFolder = addNewFolder;
  window.savePost = savePost;
});

// ========== CÁC HÀM CHÍNH ==========

// 1. Hàm tải nội dung thư mục
async function loadFolderContents(path) {
  if (isProcessing) return;
  isProcessing = true;
  
  currentFolder = path || 'content';
  const postsList = document.getElementById('posts-list');
  const breadcrumb = document.getElementById('breadcrumb') || createBreadcrumb();
  
  postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
  updateBreadcrumb(path);

  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Lỗi HTTP ${response.status}`);
    }

    const data = await response.json();
    renderFolderContents(Array.isArray(data) ? data : [data], path);

  } catch (error) {
    console.error('Lỗi tải dữ liệu:', error);
    postsList.innerHTML = `
      <div class="error">
        <i class="fas fa-exclamation-triangle"></i> Lỗi: ${escapeHtml(error.message || 'Không thể tải dữ liệu')}
        <button onclick="window.loadFolderContents('${escapeHtml(path)}')">Thử lại</button>
      </div>
    `;
  } finally {
    isProcessing = false;
  }
}

// 2. Hàm hiển thị form thêm bài mới
function addNewPost(folderPath) {
  const collectionName = determineCollectionFromPath(folderPath);
  const fields = getCollectionFields(collectionName);

  const modal = document.getElementById('create-modal') || document.createElement('div');
  modal.id = 'create-modal';
  modal.className = 'modal';
  document.body.appendChild(modal);

  const fieldsHTML = fields.map(field => renderFieldInput(field, 'create')).join('');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Tạo bài viết mới</h2>
        <span class="close-btn" onclick="document.getElementById('create-modal').style.display='none'">&times;</span>
      </div>
      <div class="modal-body">
        ${fieldsHTML}
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="window.createNewPost('${escapeHtml(folderPath)}', '${collectionName}')">
          <i class="fas fa-save"></i> Lưu
        </button>
        <button class="btn-cancel" onclick="document.getElementById('create-modal').style.display='none'">
          <i class="fas fa-times"></i> Hủy
        </button>
      </div>
    </div>
  `;

  // Thêm sự kiện cho các field đặc biệt
  initSpecialFields(modal, fields);

  modal.style.display = 'block';
}

// 3. Hàm hiển thị form chỉnh sửa
async function editPost(path, sha) {
  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) throw new Error(`Lỗi HTTP ${response.status}`);

    const fileData = await response.json();
    const content = atob(fileData.content);
    const frontmatter = parseFrontmatter(content);
    const collectionName = determineCollectionFromPath(path);
    
    showEditModal(path, content, sha, collectionName, frontmatter);

  } catch (error) {
    console.error('Lỗi khi tải nội dung bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`);
  }
}

function showEditModal(path, content, sha, collectionName, frontmatter) {
  const fields = getCollectionFields(collectionName);
  const modal = document.getElementById('edit-modal') || document.createElement('div');
  modal.id = 'edit-modal';
  modal.className = 'modal';
  document.body.appendChild(modal);

  const fieldsHTML = fields.map(field => {
    const value = frontmatter[field.name] || '';
    return renderFieldInput(field, 'edit', value);
  }).join('');

  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>Chỉnh sửa bài viết</h2>
        <span class="close-btn" onclick="document.getElementById('edit-modal').style.display='none'">&times;</span>
      </div>
      <div class="modal-body">
        ${fieldsHTML}
      </div>
      <div class="modal-footer">
        <button class="btn-primary" onclick="window.savePost('${escapeHtml(path)}', '${escapeHtml(sha)}', '${collectionName}')">
          <i class="fas fa-save"></i> Lưu
        </button>
        <button class="btn-cancel" onclick="document.getElementById('edit-modal').style.display='none'">
          <i class="fas fa-times"></i> Hủy
        </button>
      </div>
    </div>
  `;

  // Thêm sự kiện cho các field đặc biệt
  initSpecialFields(modal, fields);

  // Điền nội dung markdown
  const markdownContent = content.replace(/^---[\s\S]*?---/, '').trim();
  const bodyField = modal.querySelector('#edit-field-body');
  if (bodyField) bodyField.value = markdownContent;

  modal.style.display = 'block';
}

// 4. Hàm tạo bài viết mới
async function createNewPost(folderPath, collectionName) {
  try {
    const fields = getCollectionFields(collectionName);
    const postData = {};
    
    // Lấy giá trị từ form
    fields.forEach(field => {
      const element = document.querySelector(`#create-modal #field-${field.name}`);
      if (element) {
        postData[field.name] = getFieldValue(field, element);
      }
    });

    // Kiểm tra các field bắt buộc
    const missingFields = fields
      .filter(f => f.required && (!postData[f.name] || (Array.isArray(postData[f.name]) && postData[f.name].length === 0)))
      .map(f => f.label);
      
    if (missingFields.length > 0) {
      throw new Error(`Vui lòng điền các trường bắt buộc: ${missingFields.join(', ')}`);
    }

    // Tạo frontmatter
    let frontmatter = '---\n';
    for (const [key, value] of Object.entries(postData)) {
      if (key === 'body') continue;
      
      if (Array.isArray(value)) {
        frontmatter += `${key}:\n${value.map(item => `  - ${item}`).join('\n')}\n`;
      } else if (typeof value === 'object' && value !== null) {
        frontmatter += `${key}:\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          frontmatter += `  ${subKey}: ${subValue}\n`;
        }
      } else {
        frontmatter += `${key}: ${value}\n`;
      }
    }
    frontmatter += '---\n\n';

    // Thêm nội dung markdown
    const bodyContent = postData.body || '';
    const fullContent = frontmatter + bodyContent;

    // Tạo filename
    const filename = formatSlug(postData.title || 'bai-viet-moi') + '.md';
    const fullPath = `${folderPath}/${filename}`;

    // Gửi request tạo bài viết
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(fullPath)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Tạo bài viết mới: ${postData.title || 'Không có tiêu đề'}`,
        content: btoa(unescape(encodeURIComponent(fullContent))),
        branch: 'main'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Lỗi HTTP ${response.status}`);
    }

    // Đóng modal và làm mới danh sách
    document.getElementById('create-modal').style.display = 'none';
    alert('Tạo bài viết thành công!');
    loadFolderContents(folderPath);

  } catch (error) {
    console.error('Lỗi khi tạo bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể tạo bài viết'}`);
  }
}

// 5. Hàm lưu bài viết sau khi chỉnh sửa
async function savePost(path, sha, collectionName) {
  try {
    const fields = getCollectionFields(collectionName);
    const postData = {};
    
    // Lấy giá trị từ form
    fields.forEach(field => {
      const element = document.querySelector(`#edit-modal #field-${field.name}`);
      if (element) {
        postData[field.name] = getFieldValue(field, element);
      }
    });

    // Kiểm tra các field bắt buộc
    const missingFields = fields
      .filter(f => f.required && (!postData[f.name] || (Array.isArray(postData[f.name]) && postData[f.name].length === 0))
      .map(f => f.label);
      
    if (missingFields.length > 0) {
      throw new Error(`Vui lòng điền các trường bắt buộc: ${missingFields.join(', ')}`);
    }

    // Tạo frontmatter
    let frontmatter = '---\n';
    for (const [key, value] of Object.entries(postData)) {
      if (key === 'body') continue;
      
      if (Array.isArray(value)) {
        frontmatter += `${key}:\n${value.map(item => `  - ${item}`).join('\n')}\n`;
      } else if (typeof value === 'object' && value !== null) {
        frontmatter += `${key}:\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          frontmatter += `  ${subKey}: ${subValue}\n`;
        }
      } else {
        frontmatter += `${key}: ${value}\n`;
      }
    }
    frontmatter += '---\n\n';

    // Thêm nội dung markdown
    const bodyContent = postData.body || '';
    const fullContent = frontmatter + bodyContent;

    // Gửi request cập nhật
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

    const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${user.token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message: `Cập nhật bài viết: ${postData.title || path}`,
        content: btoa(unescape(encodeURIComponent(fullContent))),
        sha: sha,
        branch: 'main'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Lỗi HTTP ${response.status}`);
    }

    // Đóng modal và làm mới danh sách
    document.getElementById('edit-modal').style.display = 'none';
    alert('Cập nhật bài viết thành công!');
    const folderPath = path.split('/').slice(0, -1).join('/');
    loadFolderContents(folderPath);

  } catch (error) {
    console.error('Lỗi khi lưu bài viết:', error);
    alert(`Lỗi: ${error.message || 'Không thể lưu bài viết'}`);
  }
}

// ========== CÁC HÀM HỖ TRỢ ==========

// 1. Hàm render field input
function renderFieldInput(field, mode = 'create', defaultValue = '') {
  const id = `${mode}-field-${field.name}`;
  let inputHTML = '';
  const requiredAttr = field.required ? 'required' : '';
  const value = defaultValue || field.default || '';

  switch (field.widget) {
    case 'string':
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <input type="text" id="${id}" ${requiredAttr} 
                 placeholder="${field.label}" value="${escapeHtml(value)}" />
        </div>
      `;
      break;
      
    case 'text':
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <textarea id="${id}" ${requiredAttr} 
                    rows="4" placeholder="${field.label}">${escapeHtml(value)}</textarea>
        </div>
      `;
      break;
      
    case 'markdown':
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <textarea id="${id}" ${requiredAttr} 
                    rows="10" class="markdown-editor">${escapeHtml(value)}</textarea>
        </div>
      `;
      break;
      
    case 'image':
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <input type="file" id="${id}" ${requiredAttr} 
                 accept="image/*" class="image-upload" />
          ${value ? `<img src="${value}" class="image-preview" id="preview-${id}" />` : 
           `<div class="image-preview" id="preview-${id}"></div>`}
        </div>
      `;
      break;
      
    case 'datetime':
      const dateValue = value ? new Date(value).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16);
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <input type="datetime-local" id="${id}" ${requiredAttr} 
                 value="${dateValue}" />
        </div>
      `;
      break;
      
    case 'select':
      const options = field.options.map(opt => 
        `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
      ).join('');
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <select id="${id}" ${requiredAttr}>
            ${options}
          </select>
        </div>
      `;
      break;
      
    case 'list':
      const items = Array.isArray(value) ? value : (value ? [value] : ['']);
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <div class="list-container" id="container-${id}">
            ${items.map((item, index) => `
              <div class="list-item">
                <input type="text" class="list-input" value="${escapeHtml(item)}" 
                       placeholder="${field.label} ${index + 1}" />
                <button type="button" class="btn-remove-item" ${items.length <= 1 ? 'disabled' : ''}>
                  <i class="fas fa-minus"></i>
                </button>
                <button type="button" class="btn-add-item">
                  <i class="fas fa-plus"></i>
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      break;
      
    case 'object':
      const objValue = typeof value === 'object' ? value : {};
      inputHTML = `
        <div class="form-group">
          <label>${field.label}:</label>
          <div class="object-container">
            ${field.fields.map(subField => {
              const subId = `${id}-${subField.name}`;
              return `
                <div class="sub-field">
                  <label for="${subId}">${subField.label}:</label>
                  <input type="text" id="${subId}" value="${escapeHtml(objValue[subField.name] || '')}" 
                         placeholder="${subField.label}" />
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
      break;
      
    default:
      inputHTML = `
        <div class="form-group">
          <label for="${id}">${field.label}:</label>
          <input type="text" id="${id}" ${requiredAttr} 
                 placeholder="${field.label}" value="${escapeHtml(value)}" />
        </div>
      `;
  }
  
  return inputHTML;
}

// 2. Hàm lấy giá trị từ field
function getFieldValue(field, element) {
  switch (field.widget) {
    case 'list':
      const inputs = element.querySelectorAll('.list-input');
      return Array.from(inputs).map(input => input.value.trim()).filter(Boolean);
      
    case 'object':
      const obj = {};
      field.fields.forEach(subField => {
        const subElement = element.querySelector(`#${element.id}-${subField.name}`);
        if (subElement) obj[subField.name] = subElement.value.trim();
      });
      return obj;
      
    case 'datetime':
      return new Date(element.value).toISOString();
      
    case 'image':
      // Xử lý upload ảnh (cần triển khai riêng)
      return element.dataset.url || '';
      
    default:
      return element.value.trim();
  }
}

// 3. Hàm khởi tạo các field đặc biệt
function initSpecialFields(modal, fields) {
  fields.forEach(field => {
    const id = `${modal.id.includes('create') ? 'create' : 'edit'}-field-${field.name}`;
    const element = modal.querySelector(`#${id}`);
    
    if (!element) return;
    
    // Xử lý list field
    if (field.widget === 'list') {
      const container = modal.querySelector(`#container-${id}`);
      
      container.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-add-item')) {
          const newItem = document.createElement('div');
          newItem.className = 'list-item';
          newItem.innerHTML = `
            <input type="text" class="list-input" placeholder="${field.label}" />
            <button type="button" class="btn-remove-item">
              <i class="fas fa-minus"></i>
            </button>
            <button type="button" class="btn-add-item">
              <i class="fas fa-plus"></i>
            </button>
          `;
          container.appendChild(newItem);
          
          // Disable nút xóa nếu chỉ còn 1 item
          if (container.querySelectorAll('.list-item').length === 1) {
            container.querySelector('.btn-remove-item').disabled = true;
          } else {
            container.querySelectorAll('.btn-remove-item').forEach(btn => btn.disabled = false);
          }
        }
        
        if (e.target.classList.contains('btn-remove-item')) {
          if (container.querySelectorAll('.list-item').length > 1) {
            e.target.closest('.list-item').remove();
          }
          
          // Disable nút xóa nếu chỉ còn 1 item
          if (container.querySelectorAll('.list-item').length === 1) {
            container.querySelector('.btn-remove-item').disabled = true;
          }
        }
      });
    }
    
    // Xử lý image field
    if (field.widget === 'image') {
      const preview = modal.querySelector(`#preview-${id}`);
      
      element.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            preview.innerHTML = `<img src="${event.target.result}" class="image-preview" />`;
            element.dataset.url = event.target.result; // Lưu tạm URL
          };
          reader.readAsDataURL(file);
        }
      });
    }
  });
}

// 4. Hàm parse frontmatter
function parseFrontmatter(content) {
  const result = {};
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) return result;
  
  const frontmatter = frontmatterMatch[1];
  const lines = frontmatter.split('\n');
  
  let currentKey = '';
  let currentObj = null;
  
  for (const line of lines) {
    if (!line.trim()) continue;
    
    // Xử lý object
    if (line.startsWith('  ')) {
      if (!currentKey || !currentObj) continue;
      
      const match = line.match(/^\s+([^:]+):\s*(.*)/);
      if (match) {
        currentObj[match[1].trim()] = match[2].trim();
      }
      continue;
    }
    
    // Xử lý mảng
    if (line.startsWith('- ')) {
      if (!currentKey) continue;
      
      if (!Array.isArray(result[currentKey])) {
        result[currentKey] = [];
      }
      result[currentKey].push(line.replace(/^\s*-\s*/, '').trim());
      continue;
    }
    
    // Xử lý key-value thông thường
    const match = line.match(/^([^:]+):\s*(.*)/);
    if (match) {
      currentKey = match[1].trim();
      const value = match[2].trim();
      
      // Kiểm tra nếu là object
      if (value === '' && lines.find(l => l.startsWith(`  `))) {
        result[currentKey] = {};
        currentObj = result[currentKey];
      } else {
        result[currentKey] = value;
        currentObj = null;
      }
    }
  }
  
  return result;
}

// 5. Các hàm helper khác
function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatSlug(str) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function determineCollectionFromPath(path) {
  if (path.includes('posts')) return 'posts';
  if (path.includes('apps') || path.includes('content/apps')) return 'app';
  if (path.includes('jailbreak-tools')) return 'jailbreak-tools';
  return 'posts';
}

function getCollectionFields(collectionName) {
  const collection = window.CMS_CONFIG?.collections?.find(c => c.name === collectionName);
  return collection?.fields || [];
}

function createBreadcrumb() {
  const dashboard = document.getElementById('dashboard');
  const breadcrumb = document.createElement('div');
  breadcrumb.id = 'breadcrumb';
  breadcrumb.className = 'breadcrumb';
  dashboard.insertBefore(breadcrumb, dashboard.firstChild);
  return breadcrumb;
}

function updateBreadcrumb(path) {
  const breadcrumb = document.getElementById('breadcrumb');
  const parts = path.split('/');
  
  let breadcrumbHTML = `<span class="crumb" onclick="window.loadFolderContents('content')"><i class="fas fa-home"></i> Home</span>`;
  let currentPath = 'content';
  
  for (let i = 1; i < parts.length; i++) {
    currentPath += '/' + parts[i];
    breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <span class="crumb" onclick="window.loadFolderContents('${escapeHtml(currentPath)}')">${escapeHtml(parts[i])}</span>`;
  }
  
  breadcrumb.innerHTML = breadcrumbHTML;
}

function renderFolderContents(items, path) {
  const postsList = document.getElementById('posts-list');
  
  if (!items || items.length === 0) {
    postsList.innerHTML = '<div class="empty"><i class="fas fa-folder-open"></i> Không có nội dung</div>';
    return;
  }
  
  const sortedItems = [...items].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });
  
  postsList.innerHTML = `
    <div class="content-header">
      <div class="folder-path">${escapeHtml(path)}</div>
      <div class="action-buttons">
        <button id="add-post-btn" class="btn-primary">
          <i class="fas fa-plus"></i> Thêm bài viết
        </button>
        <button id="add-folder-btn" class="btn-secondary">
          <i class="fas fa-folder-plus"></i> Thêm thư mục
        </button>
      </div>
    </div>
    <div class="content-list">
      ${sortedItems.map(item => {
        if (item.type === 'dir') {
          return `
            <div class="folder-item">
              <div class="folder-name" onclick="window.loadFolderContents('${escapeHtml(item.path)}')">
                <i class="fas fa-folder"></i> ${escapeHtml(item.name)}
              </div>
              <div class="folder-actions">
                <button onclick="window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', true)">
                  <i class="fas fa-trash"></i> Xóa
                </button>
              </div>
            </div>
          `;
        } else {
          if (!item.name.toLowerCase().endsWith('.md')) return '';
          
          return `
            <div class="post-item">
              <div class="post-title" onclick="window.editPost('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}')">
                <i class="fas fa-file-alt"></i> ${escapeHtml(item.name.replace(/\.md$/i, ''))}
              </div>
              <div class="post-actions">
                <button class="btn-edit" onclick="window.editPost('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}')">
                  <i class="fas fa-edit"></i> Sửa
                </button>
                <button class="btn-delete" onclick="window.deleteItem('${escapeHtml(item.path)}', '${escapeHtml(item.sha)}', false)">
                  <i class="fas fa-trash"></i> Xóa
                </button>
                <button class="btn-view" onclick="window.viewPost('${escapeHtml(item.path)}')">
                  <i class="fas fa-eye"></i> Xem
                </button>
              </div>
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
  
  document.getElementById('add-post-btn').addEventListener('click', () => addNewPost(path));
  document.getElementById('add-folder-btn').addEventListener('click', () => addNewFolder(path));
}

// 6. Các hàm xử lý thư mục và bài viết
async function addNewFolder(parentPath) {
  const folderName = prompt('Nhập tên thư mục mới:');
  if (!folderName || !folderName.trim()) return;
  
  const formattedName = formatSlug(folderName.trim());
  const path = `${parentPath}/${formattedName}/README.md`;
  
  createNewPost(path, determineCollectionFromPath(path), `# ${folderName}\n\nThư mục này chứa nội dung về ${folderName}.`);
}

async function deleteItem(path, sha, isFolder) {
  const itemType = isFolder ? 'thư mục' : 'bài viết';
  if (!confirm(`Bạn có chắc chắn muốn xóa ${itemType} này không?`)) return;
  
  try {
    const user = window.netlifyIdentity?.currentUser();
    if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

    if (isFolder) {
      await deleteFolderRecursive(path);
    } else {
      const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(path)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Xóa ${itemType}: ${path}`,
          sha: sha,
          branch: 'main'
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Lỗi HTTP ${response.status}`);
      }
    }
    
    alert(`Xóa ${itemType} thành công!`);
    const parentFolder = path.split('/').slice(0, -1).join('/');
    loadFolderContents(parentFolder || 'content');
    
  } catch (error) {
    console.error(`Lỗi khi xóa ${itemType}:`, error);
    alert(`Lỗi: ${error.message || `Không thể xóa ${itemType}`}`);
  }
}

async function deleteFolderRecursive(folderPath) {
  const user = window.netlifyIdentity?.currentUser();
  if (!user?.token?.access_token) throw new Error('Bạn chưa đăng nhập');

  const response = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(folderPath)}`, {
    headers: {
      'Authorization': `Bearer ${user.token.access_token}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Lỗi HTTP ${response.status}`);
  }

  const items = await response.json();
  
  for (const item of items) {
    if (item.type === 'dir') {
      await deleteFolderRecursive(item.path);
    } else {
      const deleteResponse = await fetch(`/.netlify/git/github/contents/${encodeURIComponent(item.path)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token.access_token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: `Xóa file: ${item.path}`,
          sha: item.sha,
          branch: 'main'
        })
      });

      if (!deleteResponse.ok) {
        const error = await deleteResponse.json();
        throw new Error(error.message || `Lỗi HTTP ${deleteResponse.status}`);
      }
    }
  }
}

function viewPost(path) {
  const slug = path.replace('content/', '').replace(/\.md$/i, '');
  const postUrl = `${window.location.origin}/${slug}`;
  window.open(postUrl, '_blank');
}