// COMPLETE CMS ADMIN SCRIPT - READY TO COPY
document.addEventListener('DOMContentLoaded', function() {
  // CẤU HÌNH CỐT LÕI
  const BASE_URL = window.location.origin;
  const API_BASE = '/.netlify/git/github/contents';
  const CONTENT_ROOT = 'content';
  let configFields = {};
  let currentPosts = [];

  // 1. KHỞI TẠO NETLIFY IDENTITY
  if (window.netlifyIdentity) {
    netlifyIdentity.init({ APIUrl: `${BASE_URL}/.netlify/identity` });
    
    netlifyIdentity.on('login', user => {
      document.getElementById('dashboard').style.display = 'block';
      initializeCMS();
    });

    netlifyIdentity.on('logout', () => {
      document.getElementById('dashboard').style.display = 'none';
    });

    document.getElementById('login-btn').addEventListener('click', () => {
      netlifyIdentity.currentUser() ? netlifyIdentity.logout() : netlifyIdentity.open();
    });
  }

  // 2. HÀM TẢI CONFIG.YML (HOÀN CHỈNH)
  async function loadConfig() {
    try {
      const response = await fetch(`${API_BASE}/config.yml`, {
        headers: {
          'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`
        }
      });
      const data = await response.json();
      const content = atob(data.content);
      
      // PHÂN TÍCH YAML CHUẨN
      const fields = {};
      const fieldsSection = content.match(/fields:\s*\n([\s\S]*?)(\n[^\s]|$)/)[1];
      const fieldBlocks = fieldsSection.match(/-\s*name:\s*["'](.*?)["'][\s\S]*?(?=\n\s*-|$)/g);
      
      fieldBlocks.forEach(block => {
        const name = block.match(/name:\s*["'](.*?)["']/)[1];
        fields[name] = {
          label: block.match(/label:\s*["'](.*?)["']/)?.[1] || name,
          type: block.match(/widget:\s*["'](.*?)["']/)?.[1] || 'string',
          default: block.match(/default:\s*(.*?)(\n|$)/)?.[1].trim() || '',
          required: block.includes('required: true')
        };
      });
      
      return fields;
    } catch (error) {
      console.error("Lỗi tải config:", error);
      return {
        title: { label: "Tiêu đề", type: "string", required: true },
        date: { label: "Ngày", type: "datetime", default: new Date().toISOString() }
      };
    }
  }

  // 3. MODAL TẠO/SỬA BÀI VIẾT (ĐẦY ĐỦ TRƯỜNG)
  async function showPostModal(path = '', content = '') {
    const { frontmatter, body } = parseFrontmatter(content);
    const isEditMode = !!path;
    
    // TẠO MODAL
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>${isEditMode ? 'Chỉnh sửa' : 'Tạo mới'} bài viết</h2>
          <span class="close">&times;</span>
        </div>
        <div class="modal-body">
          ${Object.entries(configFields).map(([name, field]) => `
            <div class="form-group">
              <label>
                ${field.label}
                ${field.required ? '<span class="required">*</span>' : ''}
              </label>
              ${renderFieldInput(name, field, frontmatter[name])}
            </div>
          `).join('')}
          <div class="form-group">
            <label>Nội dung chính <span class="required">*</span></label>
            <textarea id="post-content" rows="15">${body}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button id="save-btn">Lưu bài viết</button>
          <button id="cancel-btn">Hủy bỏ</button>
        </div>
      </div>
    `;
    
    // XỬ LÝ SỰ KIỆN
    modal.querySelector('.close').onclick = () => modal.remove();
    modal.querySelector('#cancel-btn').onclick = () => modal.remove();
    modal.querySelector('#save-btn').onclick = async () => {
      await savePost(path, modal);
    };
    
    document.body.appendChild(modal);
  }

  function renderFieldInput(name, field, value) {
    const currentValue = value || field.default;
    switch(field.type) {
      case 'boolean':
        return `<input type="checkbox" name="${name}" ${currentValue ? 'checked' : ''}>`;
      case 'datetime':
        return `<input type="datetime-local" name="${name}" value="${currentValue}">`;
      case 'markdown':
        return `<textarea name="${name}" rows="5">${currentValue}</textarea>`;
      case 'select':
        return `<select name="${name}">${field.options.map(o => 
          `<option value="${o}" ${o === currentValue ? 'selected' : ''}>${o}</option>`
        ).join('')}</select>`;
      default:
        return `<input type="text" name="${name}" value="${currentValue}" ${
          field.required ? 'required' : ''
        }>`;
    }
  }

  // 4. HÀM LƯU BÀI VIẾT (HOÀN CHỈNH)
  async function savePost(path, modal) {
    try {
      // THU THẬP DỮ LIỆU
      const fieldsData = {};
      modal.querySelectorAll('[name]').forEach(input => {
        fieldsData[input.name] = input.type === 'checkbox' ? input.checked : input.value;
      });
      
      const content = [
        '---',
        ...Object.entries(fieldsData).map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`),
        '---',
        modal.querySelector('#post-content').value
      ].join('\n');
      
      // GỬI API
      const endpoint = path || `${CONTENT_ROOT}/${generateSlug(fieldsData.title)}.md`;
      await fetch(`${API_BASE}/${encodeURIComponent(endpoint)}`, {
        method: path ? 'PUT' : 'POST',
        headers: {
          'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `${path ? 'Cập nhật' : 'Tạo'} bài viết`,
          content: btoa(unescape(encodeURIComponent(content))),
          ...(path ? { sha: getFileSha(path) } : {})
        })
      });
      
      modal.remove();
      loadFolderContent(currentFolder);
    } catch (error) {
      alert(`Lỗi khi lưu: ${error.message}`);
    }
  }

  // 5. CÁC HÀM HỖ TRỢ
  function parseFrontmatter(content) {
    const result = { frontmatter: {}, body: content };
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)/);
    if (fmMatch) {
      fmMatch[1].split('\n').forEach(line => {
        const [key, ...val] = line.split(':');
        if (key) result.frontmatter[key.trim()] = val.join(':').trim();
      });
      result.body = fmMatch[2];
    }
    return result;
  }

  function generateSlug(title) {
    return title.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-');
  }

  // KHỞI TẠO CMS
  async function initializeCMS() {
    configFields = await loadConfig();
    loadFolderContent(CONTENT_ROOT);
  }

  // ĐĂNG KÝ HÀM TOÀN CỤC
  window.editPost = (path) => {
    fetch(`${API_BASE}/${encodeURIComponent(path)}`, {
      headers: {
        'Authorization': `Bearer ${netlifyIdentity.currentUser().token.access_token}`
      }
    })
    .then(res => res.json())
    .then(data => showPostModal(path, atob(data.content)));
  };

  window.addNewPost = () => showPostModal();
});

// CSS CẦN THIẾT
const style = document.createElement('style');
style.textContent = `
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
    padding: 20px;
    border-radius: 5px;
  }
  .form-group {
    margin-bottom: 15px;
  }
  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
  }
  .required {
    color: red;
  }
  input, textarea, select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
  }
  button {
    padding: 8px 15px;
    margin-right: 10px;
    cursor: pointer;
  }
`;
document.head.appendChild(style);