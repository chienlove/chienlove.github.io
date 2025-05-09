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

  // 5. Tải cấu hình CMS
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

  // 6. Phân tích YAML
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

  // 7. Kiểm tra nested field
  function isNestedField(field) {
    return field.widget === 'object' || 
           (field.widget === 'list' && field.fields && field.fields.length > 0);
  }

  // 8. Render field HTML (đã sửa lỗi tiếng Việt)
  function getFieldHTML(field, idPrefix = '', defaultValue = '', nameAttribute = '') {
    const fieldId = idPrefix || field.name;
    const fieldName = nameAttribute || fieldId;
    const label = field.label || field.name;
    const value = defaultValue !== undefined ? defaultValue : field.default || '';
    const hint = field.hint || '';

    let html = `<div class="form-group">
      <label for="${fieldId}">${label}${field.required ? '<span class="required">*</span>' : ''}</label>`;
    
    switch (field.widget) {
      case 'string':
        html += `<input type="text" id="${fieldId}" name="${fieldName}" class="form-control" 
               value="${escapeHtml(value)}" placeholder="${hint}">`;
        break;
      case 'text':
        html += `<textarea id="${fieldId}" name="${fieldName}" class="form-control" rows="3"
                 placeholder="${hint}">${escapeHtml(value)}</textarea>`;
        break;
      case 'markdown':
        html += `<textarea id="${fieldId}" name="${fieldName}" class="form-control" rows="10"
                 placeholder="${hint}">${escapeHtml(value)}</textarea>`;
        break;
      case 'image':
        html += `<input type="file" id="${fieldId}" name="${fieldName}" class="form-control">`;
        break;
      case 'datetime':
        html += `<input type="datetime-local" id="${fieldId}" name="${fieldName}" class="form-control"
               value="${escapeHtml(value)}">`;
        break;
      case 'select':
        html += `<select id="${fieldId}" name="${fieldName}" class="form-control">
          ${(field.options || []).map(opt => 
            `<option value="${escapeHtml(opt)}" ${opt === value ? 'selected' : ''}>${escapeHtml(opt)}</option>`
          ).join('')}
        </select>`;
        break;
      default:
        html += `<input type="text" id="${fieldId}" name="${fieldName}" class="form-control"
               value="${escapeHtml(value)}" placeholder="${hint}">`;
    }

    html += `</div>`;
    return html;
  }

  // 9. Render nested field
  function renderNestedField(field, parentName = '', defaultValue = {}) {
    let html = '';

    if (field.widget === 'object') {
      html += `<div class="nested-field-group">
                <h3>${field.label}</h3>`;

      field.fields.forEach(subField => {
        const fullName = parentName ? `${parentName}_${subField.name}` : subField.name;
        html += getFieldHTML(subField, fullName, defaultValue[subField.name]);
      });

      html += `</div>`;
    } 
    else if (field.widget === 'list') {
      html += `<div class="nested-list-field">
                <h3>${field.label}</h3>
                <div class="list-items" id="${field.name}_items">`;

      if (Array.isArray(defaultValue)) {
        defaultValue.forEach((item, index) => {
          html += `<div class="list-item" id="${field.name}_${index}">
                    <button class="btn btn-sm btn-remove-item" 
                            onclick="removeListItem('${field.name}_${index}')">×</button>`;
          field.fields.forEach(subField => {
            const fullName = `${field.name}_${index}_${subField.name}`;
            const nameAttr = `${field.name}[${index}].${subField.name}`;
            html += getFieldHTML(subField, fullName, item[subField.name], nameAttr);
          });
          html += `</div>`;
        });
      }

      html += `</div>
                <button type="button" class="btn btn-sm btn-add-item" 
                        onclick="addListItem('${field.name}', ${JSON.stringify(field.fields)})">
                  + Thêm mục
                </button>
              </div>`;
    }

    return html;
  }

  // 10. Thêm entry mới (đã tích hợp nested fields)
  window.addNewEntry = function(collectionName) {
    const collection = collectionsConfig.find(c => c.name === collectionName);
    if (!collection) {
      showNotification('Không tìm thấy collection', 'error');
      return;
    }

    let formHTML = '';
    const nestedFields = [];

    // Render tất cả fields
    collection.fields.forEach(field => {
      if (isNestedField(field)) {
        nestedFields.push(field);
        formHTML += renderNestedField(field);
      } else {
        formHTML += getFieldHTML(field);
      }
    });

    // Thêm trường body nếu không có
    if (!collection.fields.some(f => f.name === 'body')) {
      formHTML += `
        <div class="form-group">
          <label for="body">Nội dung</label>
          <textarea id="body" rows="15" class="form-control"></textarea>
        </div>
      `;
    }

    showModal({
      title: `Thêm mới ${collection.label}`,
      body: formHTML,
      onConfirm: () => {
        const frontmatter = {};
        
        // Xử lý các field thông thường
        collection.fields.forEach(field => {
          if (!isNestedField(field)) {
            const value = document.getElementById(field.name)?.value;
            if (value !== undefined && value !== '') {
              frontmatter[field.name] = value;
            }
          }
        });

        // Xử lý nested fields
        nestedFields.forEach(field => {
          if (field.widget === 'object') {
            const objData = {};
            field.fields.forEach(subField => {
              const value = document.getElementById(`${field.name}_${subField.name}`)?.value;
              if (value !== undefined && value !== '') {
                objData[subField.name] = value;
              }
            });
            if (Object.keys(objData).length > 0) {
              frontmatter[field.name] = objData;
            }
          } 
          else if (field.widget === 'list') {
            const listData = [];
            document.querySelectorAll(`#${field.name}_items .list-item`).forEach(itemEl => {
              const itemData = {};
              field.fields.forEach(subField => {
                const input = itemEl.querySelector(`[name*="${subField.name}"]`);
                if (input && input.value) {
                  itemData[subField.name] = input.value;
                }
              });
              if (Object.keys(itemData).length > 0) {
                listData.push(itemData);
              }
            });
            if (listData.length > 0) {
              frontmatter[field.name] = listData;
            }
          }
        });

        // Tạo nội dung file
        const content = `---
${Object.entries(frontmatter).map(([key, val]) => 
  `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
).join('\n')}
---

${document.getElementById('body')?.value || ''}`;

        const filename = `${formatFolderName(frontmatter.title || 'new-post')}.md`;
        createNewPost(`${collection.folder}/${filename}`, content);
        return true;
      }
    });
  };

  // 11. Thêm item vào list field
  window.addListItem = function(fieldName, subFields) {
    const container = document.getElementById(`${fieldName}_items`);
    const itemId = Date.now();
    
    let itemHTML = `<div class="list-item" id="${fieldName}_${itemId}">
                    <button class="btn btn-sm btn-remove-item" 
                            onclick="removeListItem('${fieldName}_${itemId}')">×</button>`;

    subFields.forEach(subField => {
      itemHTML += getFieldHTML(
        subField, 
        `${fieldName}_${itemId}_${subField.name}`,
        '',
        `${fieldName}[${itemId}].${subField.name}`
      );
    });

    itemHTML += `</div>`;
    container.insertAdjacentHTML('beforeend', itemHTML);
  };

  // 12. Xóa item khỏi list field
  window.removeListItem = function(itemId) {
    document.getElementById(itemId)?.remove();
  };

  // 13. Cập nhật sidebar
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
    }
    
    sidebarMenu.innerHTML = menuHTML;
    
    document.querySelectorAll('#sidebar-menu .menu-item a').forEach(item => {
      item.addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
      });
    });
  }

  // 14. Tải nội dung collection
  window.loadCollection = async function(collectionName, folderPath) {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      const collection = collectionsConfig?.find(c => c.name === collectionName);
      if (!collection) {
        showNotification('Collection không tồn tại', 'error');
        return;
      }

      currentCollection = collection;
      currentFolder = folderPath;
      const postsList = document.getElementById('posts-list');
      const contentTitle = document.getElementById('content-title');
      const contentActions = document.getElementById('content-actions');
      
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
      
      const markdownFiles = Array.isArray(data) 
        ? data.filter(item => item.name.toLowerCase().endsWith('.md'))
        : [data];
        
      markdownFiles.sort((a, b) => new Date(b.sha) - new Date(a.sha));
      
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
  };

  // 15. Tải nội dung thư mục
  window.loadFolderContents = async function(folderPath = 'content') {
    if (isProcessing) return;
    isProcessing = true;
    
    try {
      currentFolder = folderPath;
      const postsList = document.getElementById('posts-list');
      const contentTitle = document.getElementById('content-title');
      const contentActions = document.getElementById('content-actions');
      
      contentTitle.innerHTML = `<i class="fas fa-folder-open"></i> Danh sách Collection`;
      
      contentActions.innerHTML = `
        <button class="btn" onclick="window.location.reload()">
          <i class="fas fa-sync-alt"></i> Làm mới
        </button>
      `;
      
      postsList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Đang tải dữ liệu...</div>';
      
      if (!collectionsConfig || collectionsConfig.length === 0) {
        postsList.innerHTML = `
          <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Không tìm thấy collection nào. Vui lòng kiểm tra file config.yml</p>
          </div>
        `;
        return;
      }
      
      let html = `<div class="collection-grid">`;
      
      for (const collection of collectionsConfig) {
        try {
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
  };

  // 16. Chỉnh sửa bài viết
  window.editPost = async function(path, sha) {
    try {
      const fileData = await callGitHubAPI(`/.netlify/git/github/contents/${encodeURIComponent(path)}`);
      let content = atob(fileData.content);
      
      const collection = collectionsConfig.find(c => path.startsWith(c.folder));
      if (!collection) {
        showEditModal(path, content, sha);
        return;
      }

      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!frontMatterMatch) {
        showEditModal(path, content, sha);
        return;
      }
      
      const frontMatterContent = frontMatterMatch[1];
      const body = content.replace(/^---\n[\s\S]*?\n---\n/, '');
      const fields = {};
      
      // Parse frontmatter
      frontMatterContent.split('\n').forEach(line => {
        const match = line.match(/^([^:]+):\s*(.*)$/);
        if (match) {
          try {
            fields[match[1]] = JSON.parse(match[2]);
          } catch {
            fields[match[1]] = match[2];
          }
        }
      });
      
      let formHTML = '';
      const nestedFields = [];

      // Render tất cả fields
      collection.fields.forEach(field => {
        if (isNestedField(field)) {
          nestedFields.push(field);
          formHTML += renderNestedField(field, '', fields[field.name] || {});
        } else {
          formHTML += getFieldHTML(field, '', fields[field.name]);
        }
      });

      // Thêm trường body nếu không có
      if (!collection.fields.some(f => f.name === 'body')) {
        formHTML += `
          <div class="form-group">
            <label for="body">Nội dung chính</label>
            <textarea id="body" rows="15" class="form-control">${escapeHtml(body)}</textarea>
          </div>
        `;
      }

      showModal({
        title: `Chỉnh sửa ${collection.label}`,
        body: formHTML,
        onConfirm: () => {
          const frontmatter = {};
          
          // Xử lý các field thông thường
          collection.fields.forEach(field => {
            if (!isNestedField(field)) {
              const value = document.getElementById(field.name)?.value;
              if (value !== undefined && value !== '') {
                frontmatter[field.name] = value;
              }
            }
          });

          // Xử lý nested fields
          nestedFields.forEach(field => {
            if (field.widget === 'object') {
              const objData = {};
              field.fields.forEach(subField => {
                const value = document.getElementById(`${field.name}_${subField.name}`)?.value;
                if (value !== undefined && value !== '') {
                  objData[subField.name] = value;
                }
              });
              if (Object.keys(objData).length > 0) {
                frontmatter[field.name] = objData;
              }
            } 
            else if (field.widget === 'list') {
              const listData = [];
              document.querySelectorAll(`#${field.name}_items .list-item`).forEach(itemEl => {
                const itemData = {};
                field.fields.forEach(subField => {
                  const input = itemEl.querySelector(`[name*="${subField.name}"]`);
                  if (input && input.value) {
                    itemData[subField.name] = input.value;
                  }
                });
                if (Object.keys(itemData).length > 0) {
                  listData.push(itemData);
                }
              });
              if (listData.length > 0) {
                frontmatter[field.name] = listData;
              }
            }
          });

          const newContent = `---
${Object.entries(frontmatter).map(([key, val]) => 
  `${key}: ${typeof val === 'object' ? JSON.stringify(val) : val}`
).join('\n')}
---

${document.getElementById('body')?.value || ''}`;
          
          savePost(path, sha, newContent, `Cập nhật ${collection.label}`);
          return true;
        }
      });
    } catch (error) {
      console.error('Lỗi khi tải nội dung bài viết:', error);
      showNotification(`Lỗi: ${error.message || 'Không thể tải nội dung bài viết'}`, 'error');
    }
  };

  // 17. Hiển thị modal chỉnh sửa đơn giản
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

  // 18. Lưu bài viết
  window.savePost = async function(path, sha, content, message, isRename = false) {
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
  };

  // 19. Xóa bài viết/thư mục
  window.deleteItem = async function(path, sha, isFolder, silent = false) {
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
  };

  // 20. Xóa thư mục đệ quy
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

  // 21. Tạo bài viết mới
  window.createNewPost = async function(path, content) {
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
  };

  // 22. Thêm thư mục mới
  window.addNewFolder = function(parentPath) {
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
  };

  // 23. Xem bài viết
  window.viewPost = function(path) {
    const slug = path.split('/').pop().replace(/\.md$/i, '');
    const postUrl = `${window.location.origin}/${slug}`;
    window.open(postUrl, '_blank');
  };

  // 24. Gọi API GitHub
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

  // 25. Hiển thị modal
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

  // 26. Hiển thị thông báo
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

  // 27. Định dạng ngày tháng
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

  // 28. Lấy icon cho collection
  function getCollectionIcon(collectionName) {
    const icons = {
      posts: 'file-alt',
      pages: 'file',
      products: 'shopping-bag',
      categories: 'tags',
      settings: 'cog',
      users: 'users',
      app: 'mobile-alt',
      'jailbreak-tools': 'tools'
    };
    
    return icons[collectionName] || 'file';
  }

  // 29. Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // 30. Định dạng tên thư mục
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
  window.deleteItem = deleteItem;
  window.viewPost = viewPost;
  window.createNewPost = createNewPost;
  window.addNewPost = addNewPost;
  window.addNewFolder = addNewFolder;
  window.addNewEntry = addNewEntry;
  window.showSettings = () => showNotification('Tính năng đang phát triển', 'warning');
  window.addListItem = addListItem;
  window.removeListItem = removeListItem;
});