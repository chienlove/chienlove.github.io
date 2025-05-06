// editor.js - Xử lý các thao tác chỉnh sửa
function showModal(options) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h2>${options.title}</h2>
        <span class="close-btn">&times;</span>
      </div>
      <div class="modal-body">
        ${options.body || ''}
      </div>
      <div class="modal-footer">
        <button class="btn" id="modal-cancel">Hủy</button>
        <button class="btn btn-primary" id="modal-confirm">${options.confirmText || 'Lưu'}</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.style.display = 'block';
  
  // Xử lý sự kiện đóng modal
  const closeModal = () => {
    modal.remove();
    if (options.onClose) options.onClose();
  };
  
  modal.querySelector('.close-btn').addEventListener('click', closeModal);
  modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
  
  // Xử lý sự kiện confirm
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    if (options.onConfirm && options.onConfirm() !== false) {
      closeModal();
    }
  });
  
  // Đóng modal khi click ra ngoài
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Thêm animation
  setTimeout(() => {
    modal.querySelector('.modal-content').style.transform = 'translateY(0)';
    modal.querySelector('.modal-content').style.opacity = '1';
  }, 10);
  
  // Trả về đối tượng modal để có thể điều khiển từ bên ngoài
  return {
    element: modal,
    close: closeModal,
    updateContent: (newBody) => {
      modal.querySelector('.modal-body').innerHTML = newBody;
    }
  };
}

// Các hàm liên quan đến editor
function addNewPost(folderPath) {
  const modal = showModal({
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

// Export các hàm editor
window.showModal = showModal;
window.addNewPost = addNewPost;
window.addNewEntry = addNewEntry;