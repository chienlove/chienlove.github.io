// Global variables
let codeEditor;
let currentWorker = {
    id: null,
    name: '',
    lastModified: null
};
let password = '';
let workers = [];

// Initialize editor with full features
function initEditor() {
    const editorContainer = document.getElementById('code-editor-container');
    
    // Create editor wrapper
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'editor-wrapper';
    editorContainer.appendChild(editorWrapper);
    
    // Initialize CodeMirror with all features
    codeEditor = CodeMirror(editorWrapper, {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        scrollbarStyle: 'native',
        viewportMargin: Infinity,
        styleActiveLine: true,
        extraKeys: {
            'Ctrl-A': function(cm) { selectAllCode(cm); return false; },
            'Cmd-A': function(cm) { selectAllCode(cm); return false; },
            'Ctrl-Enter': function(cm) { updateWorker(); return false; },
            'Cmd-Enter': function(cm) { updateWorker(); return false; },
            'Ctrl-/': 'toggleComment',
            'Cmd-/': 'toggleComment',
            'Ctrl-Space': 'autocomplete',
            'Shift-Tab': 'indentLess'
        },
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    // Handle editor resize
    function resizeEditor() {
        const height = window.innerHeight - editorContainer.getBoundingClientRect().top - 20;
        editorWrapper.style.height = `${height}px`;
        codeEditor.setSize('100%', '100%');
        codeEditor.refresh();
    }

    window.addEventListener('resize', resizeEditor);
    resizeEditor();

    // Setup toolbar buttons
    setupToolbar();
}

// Select all text with proper highlighting
function selectAllCode(cm) {
    const firstLine = cm.firstLine();
    const lastLine = cm.lastLine();
    cm.setSelection({line: firstLine, ch: 0}, {line: lastLine, ch: cm.getLine(lastLine).length});
    cm.focus();
}

// Setup editor toolbar
function setupToolbar() {
    document.getElementById('select-all-btn').addEventListener('click', (e) => {
        e.preventDefault();
        selectAllCode(codeEditor);
    });

    document.getElementById('copy-btn').addEventListener('click', () => {
        const selected = codeEditor.getSelection();
        if (selected) {
            navigator.clipboard.writeText(selected)
                .then(() => showStatus('Đã sao chép vào clipboard', 'success'))
                .catch(err => showStatus('Lỗi khi sao chép: ' + err, 'error'));
        } else {
            showStatus('Không có nội dung được chọn', 'warning');
        }
    });

    document.getElementById('comment-btn').addEventListener('click', () => {
        codeEditor.execCommand('toggleComment');
    });
}

// Show status message
function showStatus(message, type = 'success', duration = 5000) {
    const statusEl = document.getElementById('status-message');
    statusEl.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    statusEl.className = `status-message ${type} show`;
    
    clearTimeout(statusEl.timeout);
    statusEl.timeout = setTimeout(() => {
        statusEl.classList.remove('show');
    }, duration);
}

// Set loading state
function setLoading(element, isLoading, text = '') {
    element.disabled = isLoading;
    const icon = element.querySelector('i');
    if (isLoading) {
        element.dataset.originalText = element.textContent;
        icon.className = 'fas fa-spinner fa-spin';
        element.innerHTML = `${icon.outerHTML} ${text}`;
    } else {
        icon.className = element.dataset.icon;
        element.textContent = element.dataset.originalText || text;
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return 'Chưa rõ';
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Handle login
async function handleLogin() {
    password = document.getElementById('password').value.trim();
    if (!password) {
        showStatus('Vui lòng nhập mật khẩu', 'error');
        return;
    }

    const loginBtn = document.getElementById('login-btn');
    try {
        setLoading(loginBtn, true, 'Đang xác thực...');
        
        const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Đăng nhập thất bại');
        }

        const data = await response.json();
        workers = data.workers;
        renderWorkerList(workers);
        
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('worker-selector').style.display = 'block';
        
        showStatus('Đăng nhập thành công', 'success');
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Login Error:', error);
    } finally {
        setLoading(loginBtn, false, 'Đăng nhập');
    }
}

// Render worker list
function renderWorkerList(workers) {
    const container = document.getElementById('worker-list');
    if (workers.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i> Không tìm thấy worker nào</div>';
        return;
    }

    container.innerHTML = workers.map(worker => `
        <div class="worker-card" onclick="loadWorker('${worker.id}')">
            <h3><i class="fas fa-cube"></i> ${worker.name || worker.id}</h3>
            <p><i class="fas fa-fingerprint"></i> ID: ${worker.id}</p>
            <p><i class="far fa-clock"></i> Cập nhật: ${formatDate(worker.lastModified)}</p>
        </div>
    `).join('');
}

// Load worker (global function)
window.loadWorker = async function(workerId) {
    try {
        showStatus('Đang tải worker...', 'info');
        
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
        showStatus(`Đã tải worker "${currentWorker.name}"`, 'success');
    } catch (error) {
        showStatus(`Lỗi: ${error.message}`, 'error');
        console.error('Load Worker Error:', error);
    }
};

// Update editor UI
function updateEditorUI(code) {
    document.getElementById('current-worker-name').textContent = currentWorker.name;
    document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
    document.getElementById('worker-id').textContent = currentWorker.id;
    
    codeEditor.setValue(code);
    codeEditor.clearHistory();
    
    document.getElementById('worker-selector').style.display = 'none';
    document.getElementById('editor-container').style.display = 'flex';
    
    // Focus editor after short delay
    setTimeout(() => codeEditor.focus(), 100);
}

// Update worker
async function updateWorker() {
    if (!currentWorker.id) {
        showStatus('Vui lòng chọn worker trước', 'error');
        return;
    }
    
    const code = codeEditor.getValue();
    if (!code.trim()) {
        showStatus('Mã worker không được để trống', 'error');
        return;
    }

    const updateBtn = document.getElementById('update-btn');
    try {
        setLoading(updateBtn, true, 'Đang lưu...');
        
        const response = await fetch('/api/update-worker', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                code: code,
                password: password,
                workerId: currentWorker.id
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Cập nhật thất bại');
        }

        currentWorker.lastModified = data.lastModified || new Date().toISOString();
        document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
        
        showStatus('Cập nhật thành công!', 'success');
    } catch (error) {
        let errorMessage = error.message;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Không thể kết nối đến server';
        }
        showStatus(`Lỗi: ${errorMessage}`, 'error');
        console.error('Update Error:', error);
    } finally {
        setLoading(updateBtn, false, 'Lưu thay đổi');
    }
}

// Back to list
function backToList() {
    document.getElementById('editor-container').style.display = 'none';
    document.getElementById('worker-selector').style.display = 'block';
}

// Setup search
function setupSearch() {
    const searchInput = document.getElementById('worker-search');
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = workers.filter(worker => 
            (worker.name && worker.name.toLowerCase().includes(term)) || 
            worker.id.toLowerCase().includes(term)
        );
        renderWorkerList(filtered);
    });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    initEditor();
    setupSearch();
    
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('update-btn').addEventListener('click', updateWorker);
    document.getElementById('back-btn').addEventListener('click', backToList);
    document.getElementById('password').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    // Store original icons for buttons
    document.querySelectorAll('.btn i, .tool-btn i').forEach(icon => {
        icon.parentElement.dataset.icon = icon.className;
    });
});