// Khởi tạo Netlify Identity
document.addEventListener('DOMContentLoaded', () => {
  // Tải thư viện js-yaml từ CDN
  if (!window.jsyaml) {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/js-yaml/4.1.0/js-yaml.min.js';
    script.async = true;
    document.head.appendChild(script);
  }

  netlifyIdentity.init();

  const loginBtn = document.getElementById('login-btn');
  const dashboard = document.getElementById('dashboard');

  // Xử lý đăng nhập
  loginBtn.addEventListener('click', () => {
    if (!netlifyIdentity.currentUser()) {
      netlifyIdentity.open();
    } else {
      netlifyIdentity.logout();
      window.location.reload();
    }
  });

  // Kiểm tra trạng thái đăng nhập
  netlifyIdentity.on('init', (user) => {
    if (user) {
      loginBtn.textContent = 'Logout';
      dashboard.style.display = 'flex';
      loadPosts();
      loadConfig(); // Tải cấu hình khi đăng nhập
    } else {
      loginBtn.textContent = 'Login';
      dashboard.style.display = 'none';
    }
  });

  netlifyIdentity.on('login', (user) => {
    loginBtn.textContent = 'Logout';
    dashboard.style.display = 'flex';
    loadPosts();
    loadConfig();
  });

  netlifyIdentity.on('logout', () => {
    loginBtn.textContent = 'Login';
    dashboard.style.display = 'none';
  });

  // Load dữ liệu từ Git Gateway
  async function loadPosts() {
    try {
      const response = await fetch('/.netlify/git/github/contents/content/posts', {
        headers: { 
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`
        }
      });
      const posts = await response.json();
      renderPosts(posts);
    } catch (error) {
      console.error('Error loading posts:', error);
      document.getElementById('posts-list').innerHTML = `
        <div class="error-message">
          <p>Không thể tải bài viết. Đường dẫn có thể không chính xác hoặc không có quyền truy cập.</p>
          <p>Lỗi: ${error.message}</p>
        </div>
      `;
    }
  }

  // Hiển thị danh sách bài viết
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    if (Array.isArray(posts) && posts.length > 0) {
      postsList.innerHTML = posts.map(post => `
        <div class="post-item">
          <h3>${post.name.replace('.md', '')}</h3>
          <button onclick="editPost('${post.path}')">Edit</button>
        </div>
      `).join('');
    } else {
      postsList.innerHTML = '<p>Không có bài viết nào.</p>';
    }
  }

  // Tải file config.yml
  async function loadConfig() {
    try {
      // Đợi đảm bảo js-yaml đã được tải
      if (typeof jsyaml === 'undefined') {
        await new Promise(resolve => {
          const checkYaml = setInterval(() => {
            if (typeof jsyaml !== 'undefined') {
              clearInterval(checkYaml);
              resolve();
            }
          }, 100);
        });
      }

      // Các đường dẫn thông thường cho config.yml
      const possiblePaths = [
        '/.netlify/git/github/contents/static/admin/config.yml',
        '/.netlify/git/github/contents/admin/config.yml',
        '/.netlify/git/github/contents/public/admin/config.yml'
      ];

      let response;
      let configPath;

      // Thử từng đường dẫn cho đến khi tìm thấy file
      for (const path of possiblePaths) {
        try {
          response = await fetch(path, {
            headers: { 
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`
            }
          });
          
          if (response.ok) {
            configPath = path;
            break;
          }
        } catch (e) {
          console.log(`Không tìm thấy config tại ${path}`);
        }
      }

      if (!response || !response.ok) {
        throw new Error('Không tìm thấy file config.yml ở các đường dẫn thông thường');
      }

      const data = await response.json();
      
      // Giải mã nội dung dưới dạng Base64
      const content = atob(data.content);
      
      // Parse YAML thành đối tượng JavaScript
      const config = jsyaml.load(content);
      
      // Hiển thị các trường cấu hình
      displayConfigFields(config);

      console.log(`Config đã được tải từ: ${configPath}`);
    } catch (error) {
      console.error('Error loading config:', error);
      document.getElementById('config-section').innerHTML = `
        <div class="error-message">
          <h3>Không thể tải file cấu hình</h3>
          <p>Đường dẫn có thể không chính xác hoặc không có quyền truy cập.</p>
          <p>Lỗi: ${error.message}</p>
          <p>Vui lòng kiểm tra đường dẫn đến file config.yml trong mã nguồn.</p>
        </div>
      `;
    }
  }

  // Hiển thị các trường cấu hình
  function displayConfigFields(config) {
    const configSection = document.getElementById('config-section');
    if (!configSection) return;
    
    let collectionsHTML = '';
    
    if (config.collections && Array.isArray(config.collections)) {
      collectionsHTML = config.collections.map(collection => {
        // Lấy danh sách các trường trong collection
        let fieldsHTML = '';
        
        if (collection.fields && Array.isArray(collection.fields)) {
          fieldsHTML = collection.fields.map(field => `
            <div class="config-field">
              <div class="field-info">
                <span class="field-name">${field.label || field.name}</span>
                <span class="field-widget">${field.widget || 'text'}</span>
                ${field.required ? '<span class="field-required">Required</span>' : ''}
              </div>
              <div class="field-details">
                ${field.default ? `<div><span>Default:</span> ${field.default}</div>` : ''}
                ${field.hint ? `<div><span>Hint:</span> ${field.hint}</div>` : ''}
                ${field.pattern ? `<div><span>Pattern:</span> ${field.pattern}</div>` : ''}
              </div>
            </div>
          `).join('');
        }
        
        // Kiểm tra và hiển thị file fields (nếu có)
        let fileFieldsHTML = '';
        if (collection.files && Array.isArray(collection.files)) {
          fileFieldsHTML = `
            <div class="file-fields">
              <h4>Files:</h4>
              ${collection.files.map(file => `
                <div class="file-item">
                  <h5>${file.name}: ${file.label || ''}</h5>
                  <div class="file-path">Path: ${file.file}</div>
                  <div class="file-fields-list">
                    ${file.fields && Array.isArray(file.fields) ? file.fields.map(field => `
                      <div class="config-field">
                        <div class="field-info">
                          <span class="field-name">${field.label || field.name}</span>
                          <span class="field-widget">${field.widget || 'text'}</span>
                          ${field.required ? '<span class="field-required">Required</span>' : ''}
                        </div>
                        <div class="field-details">
                          ${field.default ? `<div><span>Default:</span> ${field.default}</div>` : ''}
                          ${field.hint ? `<div><span>Hint:</span> ${field.hint}</div>` : ''}
                        </div>
                      </div>
                    `).join('') : '<p>No fields defined</p>'}
                  </div>
                </div>
              `).join('')}
            </div>
          `;
        }
        
        return `
          <div class="collection-item">
            <h3>${collection.label || collection.name || 'Unnamed Collection'}</h3>
            <div class="collection-info">
              <div><span>Name:</span> ${collection.name}</div>
              <div><span>Folder:</span> ${collection.folder || 'N/A'}</div>
              <div><span>Create:</span> ${collection.create !== false ? 'Yes' : 'No'}</div>
              <div><span>Format:</span> ${collection.format || 'yml/md'}</div>
              <div><span>Slug:</span> ${collection.slug || 'Default'}</div>
            </div>
            <div class="collection-fields">
              <h4>Fields:</h4>
              ${fieldsHTML || '<p>No fields defined</p>'}
            </div>
            ${fileFieldsHTML}
          </div>
        `;
      }).join('');
    } else {
      collectionsHTML = '<p>No collections found in config</p>';
    }
    
    configSection.innerHTML = `
      <h2>CMS Configuration</h2>
      <div class="cms-config">
        <h3>Backend: ${config.backend ? config.backend.name : 'Not specified'}</h3>
        <h3>Media Folder: ${config.media_folder || 'Not specified'}</h3>
        <h3>Public Folder: ${config.public_folder || 'Not specified'}</h3>
        <h3>Display URL: ${config.display_url || 'Not specified'}</h3>
        ${config.site_url ? `<h3>Site URL: ${config.site_url}</h3>` : ''}
        ${config.locale ? `<h3>Locale: ${config.locale}</h3>` : ''}
      </div>
      <h2>Collections Configuration</h2>
      <div class="collections-list">
        ${collectionsHTML}
      </div>
    `;
  }

  // Chuyển đổi giữa các section
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Bỏ active class từ tất cả các link
      document.querySelectorAll('.sidebar a').forEach(el => {
        el.classList.remove('active');
      });
      
      // Thêm active class cho link được click
      e.target.classList.add('active');
      
      // Ẩn tất cả các section
      document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
      });
      
      // Hiển thị section tương ứng
      document.getElementById(`${e.target.dataset.section}-section`).style.display = 'block';
    });
  });
  
  // Mặc định hiển thị posts section
  document.querySelector('.sidebar a[data-section="posts"]').classList.add('active');
  document.getElementById('posts-section').style.display = 'block';
});

// Hàm chỉnh sửa bài viết
window.editPost = (path) => {
  alert(`Edit post: ${path}`);
  // Thêm logic để chỉnh sửa bài viết tại đây
};