// Global variables
let codeEditor;
let currentWorker = {
  id: null,
  name: '',
  lastModified: null
};
let password = '';

// Initialize editor
function initEditor() {
  codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
    mode: 'javascript',
    theme: 'dracula',
    lineNumbers: true,
    lineWrapping: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 4,
    tabSize: 4,
    extraKeys: {
      'Ctrl-A': selectAllCode,
      'Cmd-A': selectAllCode,
      'Ctrl-Enter': updateWorker,
      'Cmd-Enter': updateWorker,
      'Ctrl-Space': 'autocomplete'
    },
    styleActiveLine: true
  });
}

// Select all text in editor
function selectAllCode(cm) {
  cm.execCommand("selectAll");
}

// Show status message
function showStatus(message, isError = false) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message ${isError ? 'error' : 'success'} show`;
  setTimeout(() => statusEl.classList.remove('show'), 5000);
}

// Set loading state
function setLoading(element, isLoading) {
  element.disabled = isLoading;
  const icon = element.querySelector('i') || document.createElement('i');
  icon.className = isLoading ? 'fas fa-spinner fa-spin' : element.dataset.icon;
  element.innerHTML = `${icon.outerHTML} ${element.textContent.trim()}`;
}

// Format date
function formatDate(dateString) {
  return dateString ? new Date(dateString).toLocaleString('vi-VN') : 'Chưa rõ';
}

// Handle login
async function handleLogin() {
  password = document.getElementById('password').value.trim();
  if (!password) {
    showStatus('Vui lòng nhập mật khẩu', true);
    return;
  }

  const loginBtn = document.getElementById('login-btn');
  try {
    setLoading(loginBtn, true);
    const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Đăng nhập thất bại');
    }

    const data = await response.json();
    renderWorkerList(data.workers);
    document.querySelector('.auth-section').style.display = 'none';
    document.getElementById('worker-selector').style.display = 'block';
    showStatus('Đăng nhập thành công');
  } catch (error) {
    showStatus(error.message, true);
    console.error('Login error:', error);
  } finally {
    setLoading(loginBtn, false);
  }
}

// Render worker list
function renderWorkerList(workers) {
  const container = document.getElementById('worker-list');
  container.innerHTML = workers.map(worker => `
    <div class="worker-card" onclick="loadWorker('${worker.id}')">
      <h3>${worker.name || worker.id}</h3>
      <p>ID: ${worker.id}</p>
      <p>Cập nhật: ${formatDate(worker.lastModified)}</p>
    </div>
  `).join('') || '<p class="empty">Không tìm thấy worker nào</p>';
}

// Load worker (global function)
window.loadWorker = async function(workerId) {
  try {
    showStatus('Đang tải worker...');
    const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Không thể tải worker');
    }

    const data = await response.json();
    currentWorker = {
      id: workerId,
      name: data.name || workerId,
      lastModified: data.lastModified
    };

    updateEditorUI(data.code);
    showStatus(`Đã tải worker "${currentWorker.name}"`);
  } catch (error) {
    showStatus(`Lỗi: ${error.message}`, true);
    console.error('Load error:', error);
  }
};

// Update editor UI
function updateEditorUI(code) {
  document.getElementById('current-worker-name').textContent = currentWorker.name;
  document.getElementById('last-modified').textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
  codeEditor.setValue(code);
  document.getElementById('worker-selector').style.display = 'none';
  document.getElementById('editor-container').style.display = 'block';
  codeEditor.refresh();
}

// Update worker
async function updateWorker() {
  if (!currentWorker.id) {
    showStatus('Vui lòng chọn worker', true);
    return;
  }

  const code = codeEditor.getValue();
  if (!code.trim()) {
    showStatus('Mã worker không được trống', true);
    return;
  }

  const updateBtn = document.getElementById('update-btn');
  try {
    setLoading(updateBtn, true);
    const response = await fetch('/api/update-worker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: code,
        password: password,
        workerId: currentWorker.id
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Cập nhật thất bại');
    }

    currentWorker.lastModified = data.lastModified || new Date().toISOString();
    document.getElementById('last-modified').textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
    showStatus('Cập nhật thành công!');
  } catch (error) {
    showStatus(error.message, true);
    console.error('Update error:', error);
  } finally {
    setLoading(updateBtn, false);
  }
}

// Back to list
function backToList() {
  document.getElementById('editor-container').style.display = 'none';
  document.getElementById('worker-selector').style.display = 'block';
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initEditor();
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('update-btn').addEventListener('click', updateWorker);
  document.getElementById('back-btn').addEventListener('click', backToList);
  document.getElementById('password').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
});