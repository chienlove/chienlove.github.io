document.addEventListener('DOMContentLoaded', () => {
  // Biến toàn cục
  let allPosts = [];
  let currentFolder = 'content';
  let isProcessing = false;
  let collectionsConfig = null;
  let currentCollection = null;
  let netlifyIdentity = window.netlifyIdentity;

  // 1. Khởi tạo Netlify Identity
  if (window.netlifyIdentity) {
    netlifyIdentity.init({
      APIUrl: 'https://storeios.net/.netlify/identity'
    });

    // Lấy các phần tử DOM
    const loginBtn = document.getElementById('login-btn');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebar = document.getElementById('sidebar');
    const dashboard = document.getElementById('dashboard');

    // Xử lý mở/đóng sidebar
    function setupSidebar() {
      sidebarToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
      });

      sidebarClose.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.remove('open');
      });

      document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // 2. Xử lý đăng nhập/đăng xuất
    function setupAuth() {
      loginBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const user = netlifyIdentity.currentUser();
        if (user) {
          netlifyIdentity.logout();
        } else {
          netlifyIdentity.open('login');
        }
      });

      netlifyIdentity.on('login', (user) => {
        updateUI(user);
        netlifyIdentity.close();
      });

      netlifyIdentity.on('logout', () => {
        updateUI(null);
      });

      // Kiểm tra trạng thái ban đầu
      const currentUser = netlifyIdentity.currentUser();
      updateUI(currentUser);
    }

    // 3. Cập nhật giao diện khi đăng nhập/đăng xuất
    function updateUI(user) {
      if (user) {
        loginBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> <span>Đăng xuất (${user.email.split('@')[0]})</span>`;
        loginBtn.classList.add('logout');
        dashboard.style.display = 'block';
        sidebar.style.display = 'block';
        document.body.classList.add('logged-in');
        
        // Load dữ liệu
        loadCMSConfig().then(() => {
          updateSidebar();
          loadFolderContents(currentFolder);
        }).catch(error => {
          console.error('Lỗi khi tải cấu hình:', error);
          showNotification('Lỗi tải cấu hình CMS', 'error');
        });
      } else {
        loginBtn.innerHTML = `<i class="fas fa-sign-in-alt"></i> <span>Đăng nhập</span>`;
        loginBtn.classList.remove('logout');
        dashboard.style.display = 'none';
        sidebar.style.display = 'none';
        document.body.classList.remove('logged-in');
      }
    }

    // 4. Khởi tạo ứng dụng
    function init() {
      setupSidebar();
      setupAuth();
    }

    init();
  }

  // 5. TẢI CẤU HÌNH CMS
  async function loadCMSConfig() {
    try {
      const configResponse = await callGitHubAPI('/.netlify/git/github/contents/static/admin/config.yml');
      const configContent = atob(configResponse.content);
      collectionsConfig = parseYAML(configContent).collections;
      console.log('Đã tải cấu hình CMS:', collectionsConfig);
      return collectionsConfig;
    } catch (error) {
      console.error('Lỗi khi tải cấu hình CMS:', error);
      showNotification('Lỗi tải cấu hình CMS. Vui lòng kiểm tra lại file config.yml', 'error');
      return [];
    }
  }

  // 6. PHÂN TÍCH YAML
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

  // 7. CẬP NHẬT SIDEBAR THEO COLLECTION
  function updateSidebar() {
    const sidebarMenu = document.getElementById('sidebar-menu');
    if (!sidebarMenu) return;
    
    let menuHTML = `
      <li class="menu-item active" data-folder="content">
        <a href="#" onclick="loadFolderContents('content'); return false;">
          <i class="fas fa-home"></i>
          <span>Trang chủ</span>
        </a>
      </li>
    `;
    
    if (collectionsConfig && collectionsConfig.length > 0) {
      collectionsConfig.forEach(collection => {
        const folder = collection.folder || '';
        menuHTML += `
          <li class="menu-item" data-folder="${escapeHtml(folder)}" data-collection="${escapeHtml(collection.name)}">
            <a href="#" onclick="event.stopPropagation(); loadCollection('${escapeHtml(collection.name)}', '${escapeHtml(folder)}');">
              <i class="fas fa-${getCollectionIcon(collection.name)}"></i>
              <span>${collection.label || collection.name}</span>
            </a>
          </li>
        `;
      });
    } else {
      menuHTML += `
        <li class="menu-item disabled">
          <a href="#">
            <i class="fas fa-exclamation-circle"></i>
            <span>Không có collection nào</span>
          </a>
        </li>
      `;
    }
    
    sidebarMenu.innerHTML = menuHTML;
    
    // Thêm sự kiện đóng sidebar khi click menu item
    document.querySelectorAll('#sidebar-menu .menu-item a').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  }

  // 8. TẢI NỘI DUNG COLLECTION
  async function loadCollection(collectionName, folderPath) {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      // Kiểm tra collection hợp lệ
      const collection = collectionsConfig?.find(c => c.name === collectionName);
      if (!collection) {
        showNotification('Collection không tồn tại', 'error');
        isProcessing = false;
        return;
      }

      currentCollection = collection;
      currentFolder = folderPath;
      const postsList = document.getElementById('posts-list');
      const contentTitle = document.getElementById('content-title');
      const contentActions = document.getElementById('content-actions');
      
      // Cập nhật UI
      contentTitle.innerHTML = `<i class="fas fa-${getCollectionIcon(collectionName)}"></i> ${collection.label || collection.name}`;
      
      contentActions.innerHTML = `
        <button class="btn btn-primary" onclick="addNewEntry('${collectionName}')">
          <i class="fas fa-plus"></i> Thêm mới
        </button>
        <button class="btn" onclick="loadFolderContents()">
          <i class="fas fa-arrow-left"></i> Quay lại
        </button>
      `;
      
      postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
      
      const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(folderPath)}`);
      
      // Lọc chỉ lấy file .md và sắp xếp
      const markdownFiles = Array.isArray(data) 
        ? data.filter(item => item.name.toLowerCase().endsWith('.md'))
        : [data];
        
      markdownFiles.sort((a, b) => new Date(b.sha) - new Date(a.sha));
      
      // Render danh sách bài viết
      if (markdownFiles.length === 0) {
        postsList.innerHTML = `
          <div class="empty">
            <i class="fas fa-inbox"></i>
            <p>Chưa có bài viết nào</p>
            <button class="btn btn-primary" onclick="addNewEntry('${collectionName}')">
              <i class="fas fa-plus"></i> Thêm bài viết mới
            </button>
          </div>
        `;
      } else {
        postsList.innerHTML = `
          <div class="collection-header">
            <div class="search-box">
              <input type="text" id="search-input" placeholder="Tìm kiếm..." />
              <i class="fas fa-search"></i>
            </div>
          </div>
          <div class="post-grid">
            ${markdownFiles.map(file => `
              <div class="post-card">
                <div class="post-card-header">
                  <h3 class="post-title">${escapeHtml(file.name.replace(/\.md$/i, ''))}</h3>
                  <span class="post-date">${formatDate(new Date(file.sha))}</span>
                </div>
                <div class="post-card-actions">
                  <button class="btn btn-sm btn-edit" onclick="editPost('${escapeHtml(file.path)}', '${escapeHtml(file.sha)}')">
                    <i class="fas fa-edit"></i> Sửa
                  </button>
                  <button class="btn btn-sm btn-view" onclick="viewPost('${escapeHtml(file.path)}')">
                    <i class="fas fa-eye"></i> Xem
                  </button>
                  <button class="btn btn-sm btn-delete" onclick="deleteItem('${escapeHtml(file.path)}', '${escapeHtml(file.sha)}', false)">
                    <i class="fas fa-trash"></i> Xóa
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `;
        
        // Thêm chức năng tìm kiếm
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          searchInput.addEventListener('input', function() {
            const term = this.value.toLowerCase();
            document.querySelectorAll('.post-card').forEach(card => {
              const title = card.querySelector('.post-title').textContent.toLowerCase();
              card.style.display = title.includes(term) ? 'flex' : 'none';
            });
          });
        }
      }
    } catch (error) {
      console.error('Lỗi tải collection:', error);
      const postsList = document.getElementById('posts-list');
      postsList.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Lỗi: ${escapeHtml(error.message || 'Không thể tải dữ liệu')}</p>
          <button class="btn" onclick="loadCollection('${collectionName}', '${folderPath}')">
            Thử lại
          </button>
        </div>
      `;
    } finally {
      isProcessing = false;
    }
  }

  // 9. TẢI NỘI DUNG THƯ MỤC
  async function loadFolderContents(folderPath = 'content') {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      currentFolder = folderPath;
      const postsList = document.getElementById('posts-list');
      const contentTitle = document.getElementById('content-title');
      const contentActions = document.getElementById('content-actions');
      
      // Hiển thị tiêu đề
      contentTitle.innerHTML = `<i class="fas fa-folder-open"></i> Danh sách Collection`;
      
      // Ẩn nút thêm thư mục vì chỉ làm việc với collection
      contentActions.innerHTML = `
        <button class="btn" onclick="window.location.reload()">
          <i class="fas fa-sync-alt"></i> Làm mới
        </button>
      `;
      
      postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
      
      // Chỉ lấy danh sách collection từ config
      if (!collectionsConfig || collectionsConfig.length === 0) {
        postsList.innerHTML = `
          <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Không tìm thấy collection nào. Vui lòng kiểm tra file config.yml</p>
          </div>
        `;
        return;
      }
      
      // Tạo danh sách thư mục dạng card
      let html = `<div class="collection-grid">`;
      
      for (const collection of collectionsConfig) {
        try {
          // Lấy 3 bài viết mới nhất để hiển thị preview
          const data = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(collection.folder)}?sort=updated&direction=desc&per_page=3`);
          const latestPosts = Array.isArray(data) ? data.slice(0, 3) : [];
          
          html += `
            <div class="collection-card" onclick="loadCollection('${collection.name}', '${collection.folder}')">
              <div class="collection-header">
                <i class="fas fa-${getCollectionIcon(collection.name)}"></i>
                <h3>${collection.label || collection.name}</h3>
              </div>
              <div class="collection-stats">
                <span><i class="fas fa-file-alt"></i> ${latestPosts.length} bài viết</span>
              </div>
              <div class="latest-posts">
                ${latestPosts.map(post => `
                  <div class="post-preview">
                    ${post.name.replace(/\.md$/, '')}
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        } catch (error) {
          console.error(`Lỗi khi tải collection ${collection.name}:`, error);
          html += `
            <div class="collection-card error">
              <div class="collection-header">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>${collection.label || collection.name}</h3>
              </div>
              <p>Không thể tải dữ liệu</p>
            </div>
          `;
        }
      }
      
      html += `</div>`;
      postsList.innerHTML = html;
      
    } catch (error) {
      console.error('Lỗi tải dữ liệu:', error);
      const postsList = document.getElementById('posts-list');
      postsList.innerHTML = `
        <div class="error">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Lỗi: ${error.message || 'Không thể tải dữ liệu'}</p>
          <button class="btn" onclick="loadFolderContents()">
            Thử lại
          </button>
        </div>
      `;
    } finally {
      isProcessing = false;
    }
  }

  // 10. THÊM ENTRY MỚI CHO COLLECTION
  function addNewEntry(collectionName) {
    const collection = collectionsConfig?.find(c => c.name === collectionName);
    if (!collection) {
      showNotification('Không tìm thấy cấu hình collection', 'error');
      return;
    }
    
    let formHTML = '';
    
    collection.fields.forEach(field => {
      if (!field.name || !field.label || field.name === 'body') return;
      
      formHTML += `<div class="form-group">`;
      formHTML += `<label for="field-${field.name}">${field.label}${field.required ? '<span class="required">*</span>' : ''}</label>`;
      
      if (field.widget === 'list' && field.fields) {
        formHTML += `
          <div class="list-field" id="list-container-${field.name}">
            <div class="list-items" id="list-${field.name}"></div>
            <button type="button" class="btn btn-sm btn-add-item" 
              onclick="addListItem('${field.name}', ${JSON.stringify(field.fields)})">
              + Thêm phiên bản
            </button>
          </div>
        `;
      } else {
        formHTML += `
          <input type="text" id="field-${field.name}" class="form-control" 
            value="${field.default || ''}" 
            placeholder="${field.hint || ''}">
        `;
      }
      
      formHTML += `</div>`;
    });
    
    formHTML += `
      <div class="form-group">
        <label for="field-body">Nội dung:</label>
        <textarea id="field-body" rows="15" class="form-control"></textarea>
      </div>
    `;
    
    showModal({
      title: `Thêm mới ${collection.label || collection.name}`,
      body: formHTML,
      onConfirm: () => {
        const frontMatter = {};
        
        collection.fields.forEach(field => {
          if (field.name === 'body') return;
          
          if (field.widget === 'list' && field.fields) {
            const items = [];
            document.querySelectorAll(`#list-${field.name} .list-item`).forEach(itemEl => {
              const itemData = {};
              field.fields.forEach(subField => {
                const input = itemEl.querySelector(`[name$="${subField.name}"]`);
                if (input) itemData[subField.name] = input.value;
              });
              items.push(itemData);
            });
            frontMatter[field.name] = items;
          } else {
            const value = document.getElementById(`field-${field.name}`)?.value;
            if (value) frontMatter[field.name] = value;
          }
        });
        
        const content = `---
${Object.entries(frontMatter).map(([key, val]) => 
  `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
).join('\n')}
---

${document.getElementById('field-body').value}
`;
        
        const filename = `${formatFolderName(frontMatter.title || 'new-post')}.md`;
        createNewPost(`${collection.folder}/${filename}`, content);
        return true;
      }
    });
  }

  // 11. CHỈNH SỬA BÀI VIẾT
  async function editPost(path, sha) {
    try {
      const fileData = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
      
      let content;
      try {
        const base64Content = atob(fileData.content.replace(/\s/g, ''));
        content = decodeURIComponent(escape(base64Content));
      } catch (e) {
        console.error('Lỗi decode content:', e);
        content = atob(fileData.content);
      }

      // Kiểm tra xem có phải là collection item không
      const collection = collectionsConfig?.find(c => path.startsWith(c.folder));
      
      if (content.startsWith('---') && collection) {
        const frontMatterEnd = content.indexOf('---', 3);
        if (frontMatterEnd === -1) {
          throw new Error('Không tìm thấy kết thúc frontmatter');
        }
        
        const frontMatter = content.substring(3, frontMatterEnd).trim();
        const body = content.substring(frontMatterEnd + 3).trim();
        
        // Parse frontmatter thành object
        const fields = {};
        const lines = frontMatter.split('\n');
        for (const line of lines) {
          if (!line.trim()) continue;
          
          const separatorIndex = line.indexOf(':');
          if (separatorIndex > 0) {
            const key = line.substring(0, separatorIndex).trim();
            let value = line.substring(separatorIndex + 1).trim();
            
            // Xử lý giá trị được bọc trong quotes hoặc dạng JSON
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            } else if (value.startsWith('[') || value.startsWith('{')) {
              try {
                value = JSON.parse(value);
              } catch (e) {
                console.error('Lỗi parse JSON:', e);
              }
            }
            
            fields[key] = value;
          }
        }
        
        // Hiển thị modal chỉnh sửa với đầy đủ trường
        showEditCollectionModal(collection, path, sha, fields, body);
        return;
      }
      
      // Nếu không phải collection item hoặc không có frontmatter, hiển thị editor đơn giản
      showEditModal(path, content, sha);
      
    } catch (error) {
      console.error('Lỗi khi tải nội dung bài viết:', error);
      showNotification(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`, 'error');
    }
  }

  // 12. HIỂN THỊ MODAL CHỈNH SỬA COLLECTION ENTRY
  function showEditCollectionModal(collection, path, sha, fields, body) {
    let formHTML = '';
    
    collection.fields.forEach(field => {
      if (!field.name || !field.label || field.name === 'body') return;
      
      const fieldLabel = field.label || field.name;
      const value = fields[field.name] || '';
      const hint = field.hint ? `placeholder="${escapeHtml(field.hint)}"` : '';
      
      formHTML += `<div class="form-group">`;
      
      if (field.widget === 'list' && field.fields) {
        formHTML += `<fieldset class="list-field">
          <legend>${escapeHtml(fieldLabel)}</legend>
          <div class="list-items" id="list-${field.name}">`;
        
        try {
          const listValue = Array.isArray(value) ? value : (value ? [value] : []);
          
          listValue.forEach((item, index) => {
            formHTML += `<div class="list-item">
              <button class="btn btn-sm btn-remove-item" type="button" onclick="removeListItem(this)">×</button>`;
            
            field.fields.forEach(subField => {
              const subFieldLabel = subField.label || subField.name;
              const subValue = item?.[subField.name] || '';
              const subHint = subField.hint ? `placeholder="${escapeHtml(subField.hint)}"` : '';
              
              formHTML += `<div class="sub-field">
                <label>${escapeHtml(subFieldLabel)}</label>
                <input type="text" 
                       class="form-control" 
                       name="${field.name}[${index}].${subField.name}" 
                       value="${escapeHtml(subValue)}"
                       ${subHint}>
              </div>`;
            });
            
            formHTML += `</div>`;
          });
        } catch (e) {
          console.error('Lỗi khi parse list value:', e);
        }
        
        formHTML += `</div>
          <button type="button" class="btn btn-sm btn-add-item" onclick="addListItem('${field.name}', ${JSON.stringify(field.fields)})">
            + Thêm mục
          </button>
        </fieldset>`;
      } else {
        formHTML += `<label for="field-${field.name}">${escapeHtml(fieldLabel)}${field.required ? '<span class="required">*</span>' : ''}</label>`;
        
        switch (field.widget) {
          case 'datetime':
            formHTML += `<input type="datetime-local" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}">`;
            break;
          case 'date':
            formHTML += `<input type="date" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}">`;
            break;
          case 'select':
            formHTML += `
              <select id="field-${field.name}" class="form-control">
                ${(field.options || []).map(option => 
                  `<option value="${escapeHtml(option)}" ${option === value ? 'selected' : ''}>${escapeHtml(option)}</option>`
                ).join('')}
              </select>
            `;
            break;
          case 'textarea':
            formHTML += `<textarea id="field-${field.name}" class="form-control" rows="4" ${hint}>${escapeHtml(value)}</textarea>`;
            break;
          case 'boolean':
            formHTML += `
              <div class="checkbox-wrapper">
                <input type="checkbox" id="field-${field.name}" ${value === 'true' ? 'checked' : ''}>
                <label for="field-${field.name}">${escapeHtml(fieldLabel)}</label>
              </div>
            `;
            break;
          default:
            formHTML += `<input type="text" id="field-${field.name}" class="form-control" value="${escapeHtml(value)}" ${hint}>`;
        }
      }
      
      formHTML += `</div>`;
    });
    
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
        const frontMatter = {};
        
        // Xử lý các trường thông thường
        collection.fields.forEach(field => {
          if (field.name === 'body') return;
          
          let value;
          const fieldElement = document.getElementById(`field-${field.name}`);
          
          if (!fieldElement) {
            // Xử lý các trường trong list
            if (field.widget === 'list' && field.fields) {
              const listItems = [];
              const itemElements = document.querySelectorAll(`#list-${field.name} .list-item`);
              
              itemElements.forEach(itemEl => {
                const itemValue = {};
                field.fields.forEach(subField => {
                  const input = itemEl.querySelector(`[name^="${field.name}"][name$="${subField.name}"]`);
                  if (input) itemValue[subField.name] = input.value;
                });
                listItems.push(itemValue);
              });
              
              frontMatter[field.name] = listItems.length > 0 ? listItems : null;
            }
            return;
          }
          
          switch (field.widget) {
            case 'boolean':
              value = fieldElement.checked ? 'true' : 'false';
              break;
            default:
              value = fieldElement.value;
          }
          
          if (value !== undefined && value !== '') {
            frontMatter[field.name] = value;
          }
        });
        
        const newBody = document.getElementById('field-body')?.value || '';
        
        // Tạo nội dung file mới
        let newContent = '---\n';
        Object.entries(frontMatter).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            if (typeof val === 'object') {
              newContent += `${key}: ${JSON.stringify(val)}\n`;
            } else {
              newContent += `${key}: ${val}\n`;
            }
          }
        });
        newContent += `---\n\n${newBody}`;
        
        savePost(path, sha, newContent, `Cập nhật ${collection.label || collection.name}`);
        return true;
      }
    });
  }

  // 13. HIỂN THỊ MODAL CHỈNH SỬA ĐƠN GIẢN
  function showEditModal(path, content, sha) {
    const filename = path.split('/').pop();
    
    showModal({
      title: 'Chỉnh sửa bài viết',
      confirmText: 'Lưu',
      body: `
        <div class="form-group">
          <label for="edit-title">Tiêu đề:</label>
          <input type="text" id="edit-title" class="form-control" value="${escapeHtml(filename.replace(/\.md$/i, ''))}" data-oldname="${escapeHtml(filename)}">
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

  // 14. LƯU BÀI VIẾT
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
        const oldPath = path.split('/').slice(0, -1).join('/') + '/' + document.getElementById('edit-title').getAttribute('data-oldname');
        await deleteItem(oldPath, sha, false, true);
        apiPath = path;
        delete updateData.sha;
      }
      
      await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(apiPath)}`, isRename ? 'PUT' : 'PUT', updateData);
      
      showNotification('Lưu thành công!', 'success');
      const folderPath = path.split('/').slice(0, -1).join('/');
      
      if (window.currentCollection) {
        window.loadCollection(window.currentCollection.name, window.currentCollection.folder);
      } else {
        window.loadFolderContents(folderPath || 'content');
      }
      
    } catch (error) {
      console.error('Lỗi khi lưu bài viết:', error);
      showNotification(`Lỗi: ${error.message || 'Không thể lưu bài viết'}`, 'error');
    }
  }

  // 15. XÓA BÀI VIẾT HOẶC THƯ MỤC
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
      
      if (window.currentCollection) {
        window.loadCollection(window.currentCollection.name, window.currentCollection.folder);
      } else {
        window.loadFolderContents(parentFolder || 'content');
      }
      
    } catch (error) {
      console.error(`Lỗi khi xóa ${itemType}:`, error);
      showNotification(`Lỗi: ${error.message || `Không thể xóa ${itemType}`}`, 'error');
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
      
      if (window.currentCollection) {
        window.loadCollection(window.currentCollection.name, window.currentCollection.folder);
      } else {
        window.loadFolderContents(parentFolder || 'content');
      }
      
    } catch (error) {
      console.error('Lỗi khi tạo nội dung mới:', error);
      showNotification(`Lỗi: ${error.message || 'Không thể tạo nội dung mới'}`, 'error');
    }
  }

  // 18. HIỂN THỊ MODAL
  function showModal({ title, body, confirmText = 'Lưu', onConfirm }) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${title}</h2>
          <button class="modal-close">&times;</button>
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
    
    modalOverlay.innerHTML = '';
    modalOverlay.appendChild(modal);
    modalOverlay.classList.add('active');
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
    
    modal.querySelector('#modal-cancel').addEventListener('click', () => {
      modalOverlay.classList.remove('active');
    });
    
    modal.querySelector('#modal-confirm').addEventListener('click', () => {
      if (onConfirm && onConfirm() !== false) {
        modalOverlay.classList.remove('active');
      }
    });
    
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
      }
    });
  }

  // 19. HIỂN THỊ THÔNG BÁO
  function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(notification);
    
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 3000);
  }

  // 20. ĐỊNH DẠNG NGÀY THÁNG
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

  // 21. LẤY ICON CHO COLLECTION
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

  // 22. ESCAPE HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 23. ĐỊNH DẠNG TÊN THƯ MỤC
  function formatFolderName(name) {
    return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/đ/g, 'd')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
  }

  // 24. THÊM ITEM VÀO LIST FIELD
  function addListItem(fieldName, subFields) {
    const listContainer = document.getElementById(`list-${fieldName}`);
    if (!listContainer) return;
    
    const itemCount = listContainer.querySelectorAll('.list-item').length;
    const itemId = `${fieldName}-${itemCount}`;
    
    let itemHTML = `
      <div class="list-item">
        <button class="btn btn-sm btn-remove-item" type="button" onclick="removeListItem(this)">×</button>
    `;
    
    subFields.forEach(subField => {
      const subFieldLabel = subField.label || subField.name;
      const subHint = subField.hint ? `placeholder="${escapeHtml(subField.hint)}"` : '';
      
      itemHTML += `
        <div class="sub-field">
          <label>${escapeHtml(subFieldLabel)}</label>
          <input type="text" 
                 class="form-control" 
                 name="${fieldName}[${itemCount}].${subField.name}" 
                 ${subHint}>
        </div>
      `;
    });
    
    itemHTML += `</div>`;
    listContainer.insertAdjacentHTML('beforeend', itemHTML);
  }

  // 25. XÓA ITEM KHỎI LIST FIELD
  function removeListItem(button) {
    const listItem = button.closest('.list-item');
    if (listItem) {
      listItem.remove();
    }
  }

  // 26. XEM BÀI VIẾT
  function viewPost(path) {
    const slug = path.split('/').pop().replace(/\.md$/i, '');
    const postUrl = `${window.location.origin}/${slug}`;
    window.open(postUrl, '_blank');
  }

  // Đăng ký hàm toàn cục
  window.loadFolderContents = loadFolderContents;
  window.loadCollection = loadCollection;
  window.editPost = editPost;
  window.deleteItem = deleteItem;
  window.viewPost = viewPost;
  window.createNewPost = createNewPost;
  window.addNewPost = addNewPost;
  window.addNewFolder = addNewFolder;
  window.addNewEntry = addNewEntry;
  window.showSettings = () => showNotification('Tính năng đang phát triển', 'warning');
  window.addListItem = addListItem;
  window.removeListItem = removeListItem;

  // 27. GỌI API GITHUB
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
});