// collections.js - Xử lý collections và content
let collectionsConfig = null;
let currentCollection = null;

async function loadCMSConfig() {
  try {
    const configResponse = await callGitHubAPI('/.netlify/git/github/contents/static/admin/config.yml');
    const configContent = atob(configResponse.content);
    collectionsConfig = parseYAML(configContent).collections;
    return collectionsConfig;
  } catch (error) {
    console.error('Lỗi khi tải cấu hình CMS:', error);
    showNotification('Lỗi tải cấu hình CMS', 'error');
    return null;
  }
}

function parseYAML(yamlString) {
  const result = { collections: [] };
  const lines = yamlString.split('\n');
  let currentCollection = null;
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

// Export các hàm liên quan đến collections
window.loadCMSConfig = loadCMSConfig;
window.collectionsConfig = () => collectionsConfig;
window.currentCollection = () => currentCollection;