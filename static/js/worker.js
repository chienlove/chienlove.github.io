// Global variables
let codeEditor;
let currentWorker = {
    id: null,
    name: '',
    lastModified: null
};
let password = '';
let workers = [];

// Initialize editor with iOS fixes
function initEditor() {
    const editorContainer = document.getElementById('code-editor-container');
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'editor-wrapper';
    editorContainer.appendChild(editorWrapper);
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const editorOptions = {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        viewportMargin: Infinity,
        inputStyle: isIOS ? 'contenteditable' : 'textarea',
        spellcheck: false,
        extraKeys: {
            'Ctrl-Enter': function() { updateWorker(); },
            'Cmd-Enter': function() { updateWorker(); },
            'Ctrl-/': 'toggleComment',
            'Cmd-/': 'toggleComment',
            'Ctrl-A': function(cm) {
                cm.setSelection({line: 0, ch: 0}, {line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length});
            },
            'Cmd-A': function(cm) {
                cm.setSelection({line: 0, ch: 0}, {line: cm.lastLine(), ch: cm.getLine(cm.lastLine()).length});
            }
        }
    };

    codeEditor = CodeMirror(editorWrapper, editorOptions);

    if (isIOS) {
        editorWrapper.style.userSelect = 'text';
        editorWrapper.style.webkitUserSelect = 'text';
    }

    // Fix scrolling on mobile
    editorWrapper.addEventListener('touchstart', function(e) {
        if (e.touches.length > 1) e.preventDefault();
    }, { passive: false });

    function resizeEditor() {
        const editorContainer = document.getElementById('code-editor-container');
        const height = window.innerHeight - editorContainer.getBoundingClientRect().top - 20;
        editorContainer.style.height = `${height}px`;
        codeEditor.setSize('100%', '100%');
        codeEditor.refresh();
        setTimeout(() => codeEditor.refresh(), 100);
    }

    window.addEventListener('resize', resizeEditor);
    resizeEditor();
}

// Helper functions
function showStatus(message, type = 'success', duration = 3000) {
    const statusEl = document.getElementById('status-message');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type} show`;
    clearTimeout(statusEl.timeout);
    statusEl.timeout = setTimeout(() => statusEl.classList.remove('show'), duration);
}

function setLoading(element, isLoading, text = '') {
    if (!element) return;
    
    element.disabled = isLoading;
    
    if (isLoading) {
        element.dataset.originalHTML = element.innerHTML;
        element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    } else {
        element.innerHTML = element.dataset.originalHTML || text;
    }
}

// Password toggle functionality
function setupPasswordToggle() {
    const toggleBtn = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    
    toggleBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const isPassword = passwordInput.type === 'password';
        passwordInput.type = isPassword ? 'text' : 'password';
        toggleBtn.innerHTML = isPassword ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        passwordInput.focus();
    });
}

// Load saved password if remember me is checked
function loadSavedPassword() {
    const savedPassword = localStorage.getItem('savedPassword');
    const rememberMe = localStorage.getItem('rememberPassword') === 'true';
    
    if (rememberMe && savedPassword) {
        document.getElementById('password').value = savedPassword;
        document.getElementById('remember-password').checked = true;
    }
}

// Format date properly
function formatDate(dateString) {
    if (!dateString || dateString === 'null' || dateString === 'undefined') return 'Chưa rõ';
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Chưa rõ';
        
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        console.error('Lỗi định dạng ngày:', dateString, e);
        return 'Chưa rõ';
    }
}

// API functions
async function handleLogin() {
    const passwordInput = document.getElementById('password');
    password = passwordInput.value.trim();
    
    if (!password) {
        showStatus('Vui lòng nhập mật khẩu', 'error');
        passwordInput.focus();
        return;
    }

    const rememberMe = document.getElementById('remember-password').checked;
    if (rememberMe) {
        localStorage.setItem('savedPassword', password);
        localStorage.setItem('rememberPassword', 'true');
    } else {
        localStorage.removeItem('savedPassword');
        localStorage.removeItem('rememberPassword');
    }

    const loginBtn = document.getElementById('login-btn');
    try {
        setLoading(loginBtn, true, 'Đang xác thực...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`, {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Đăng nhập thất bại');
        }

        workers = data.workers || [];
        renderWorkerList(workers);
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('worker-selector').style.display = 'block';
        showStatus('Đăng nhập thành công', 'success');
    } catch (error) {
        const errorMsg = error.name === 'AbortError' 
            ? 'Kết nối quá hạn, vui lòng thử lại' 
            : error.message;
        showStatus(errorMsg, 'error');
        console.error('Login Error:', error);
    } finally {
        setLoading(loginBtn, false, '<i class="fas fa-sign-in-alt"></i> Đăng nhập');
    }
}

function renderWorkerList(workers) {
    const container = document.getElementById('worker-list');
    container.innerHTML = workers.length ? workers.map(worker => `
        <div class="worker-card" onclick="loadWorker('${worker.id}')">
            <h3><i class="fas fa-cube"></i> ${worker.name || worker.id}</h3>
            <p><i class="fas fa-fingerprint"></i> ID: ${worker.id}</p>
            <p><i class="far fa-clock"></i> Cập nhật: ${formatDate(worker.lastModified)}</p>
        </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-inbox"></i> Không tìm thấy worker nào</div>';
}

window.loadWorker = async function(workerId) {
    try {
        showStatus('Đang tải worker...', 'info');
        const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Không thể tải worker');

        currentWorker = {
            id: workerId,
            name: data.name || workerId,
            lastModified: data.lastModified || null
        };

        codeEditor.setValue(data.code || '');
        codeEditor.refresh();
        document.getElementById('current-worker-name').textContent = currentWorker.name;
        document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
        document.getElementById('worker-id').textContent = currentWorker.id;
        
        document.getElementById('worker-selector').style.display = 'none';
        document.getElementById('editor-container').style.display = 'flex';
        setTimeout(() => codeEditor.focus(), 100);
        
        showStatus(`Đã tải worker "${currentWorker.name}"`, 'success');
    } catch (error) {
        showStatus(error.message, 'error');
        console.error('Load Worker Error:', error);
    }
};

// Prepare worker code for Cloudflare API
function prepareWorkerCodeForCloudflare(code) {
    // 1. Remove BOM if exists
    if (code.charCodeAt(0) === 0xFEFF) {
        code = code.slice(1);
    }
    
    // 2. Normalize line endings to LF
    code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 3. Trim whitespace
    code = code.trim();
    
    // 4. Remove invisible Unicode characters
    code = code.replace(/[\u200B-\u200D\uFEFF]/g, '');
    
    return code;
}

// Parse API response
async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
        data = await response.json();
    } else {
        const text = await response.text();
        throw new Error(`Phản hồi không hợp lệ từ API: ${text.substring(0, 100)}`);
    }
    
    if (!response.ok) {
        throw new Error(data.error || `Lỗi API (${response.status})`);
    }
    
    return data;
}

async function updateWorker() {
    if (!currentWorker.id || !/^[a-z0-9_-]+$/i.test(currentWorker.id)) {
        showStatus('Vui lòng chọn worker hợp lệ từ danh sách', 'error');
        return;
    }

    let code = codeEditor.getValue();
    
    // Prepare code exactly like Cloudflare Dashboard does
    code = prepareWorkerCodeForCloudflare(code);
    
    if (!code) {
        showStatus('Nội dung worker không được để trống', 'error');
        return;
    }

    const updateBtn = document.getElementById('update-btn');
    try {
        setLoading(updateBtn, true, 'Đang lưu...');

        const response = await fetch('/api/update-worker', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workerId: currentWorker.id,
                code: code,
                password: password
            })
        });

        const data = await parseApiResponse(response);
        
        currentWorker.lastModified = data.lastModified || new Date().toISOString();
        document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
        showStatus('Lưu thành công!', 'success');

    } catch (error) {
        console.error('Update Failed:', {
            workerId: currentWorker.id,
            error: error.message
        });
        
        // Handle Cloudflare syntax errors specifically
        if (error.message.includes('syntax_error')) {
            try {
                const errorData = JSON.parse(error.message.replace('Phản hồi không hợp lệ từ API: ', ''));
                showStatus(`Lỗi cú pháp${errorData.line !== 'unknown' ? ` dòng ${errorData.line}` : ''}: ${errorData.message}`, 'error', 5000);
            } catch (e) {
                showStatus(error.message, 'error', 5000);
            }
        } else {
            showStatus(error.message || 'Lỗi không xác định khi cập nhật', 'error', 5000);
        }
    } finally {
        setLoading(updateBtn, false, '<i class="fas fa-save"></i> Lưu thay đổi');
    }
}

function backToList() {
    document.getElementById('editor-container').style.display = 'none';
    document.getElementById('worker-selector').style.display = 'block';
}

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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initEditor();
    setupSearch();
    setupPasswordToggle();
    loadSavedPassword();
    
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('update-btn').addEventListener('click', updateWorker);
    document.getElementById('back-btn').addEventListener('click', backToList);
    
    document.getElementById('password').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});