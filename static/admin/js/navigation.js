// navigation.js - Xử lý breadcrumb và điều hướng
function createBreadcrumb() {
  const dashboard = document.getElementById('dashboard');
  const breadcrumb = document.createElement('div');
  breadcrumb.id = 'breadcrumb';
  breadcrumb.className = 'breadcrumb';
  dashboard.insertBefore(breadcrumb, dashboard.querySelector('.content-body'));
  return breadcrumb;
}

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

// Export các hàm điều hướng
window.createBreadcrumb = createBreadcrumb;
window.updateBreadcrumb = updateBreadcrumb;