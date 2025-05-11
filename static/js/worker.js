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

async function updateWorker() {
    if (!currentWorker.id) {
        showStatus('Vui lòng chọn worker trước', 'error');
        return;
    }
    
    const code = codeEditor.getValue().trim();
    if (!code) {
        showStatus('Mã worker không được để trống', 'error');
        return;
    }

    const updateBtn = document.getElementById('update-btn');
    try {
        setLoading(updateBtn, true, 'Đang lưu...');
        
        const response = await fetch('/api/update-worker', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workerId: currentWorker.id,
                code: code,
                password: password
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            
            // Xử lý lỗi từ Cloudflare API chi tiết
            if (errorData.error === 'cloudflare_api_error') {
                console.error('Chi tiết lỗi Cloudflare:', {
                    workerId: currentWorker.id,
                    codeLength: code.length,
                    errors: errorData.details
                });
                
                // Tạo thông báo lỗi chi tiết
                let errorMessage = 'Lỗi Cloudflare: ';
                if (errorData.details && errorData.details.length > 0) {
                    errorMessage += errorData.details.map(e => 
                        `${e.message} (code: ${e.code})`
                    ).join(', ');
                } else {
                    errorMessage += errorData.message || 'Lỗi không xác định';
                }
                
                throw new Error(errorMessage);
            }
            throw new Error(errorData.message || 'Cập nhật thất bại');
        }

        const data = await response.json();
        currentWorker.lastModified = data.lastModified || new Date().toISOString();
        document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
        showStatus('Cập nhật thành công!', 'success');
    } catch (error) {
        let displayMessage = error.message;
        
        // Xử lý thông báo lỗi đặc biệt
        if (error.message.includes('code:') && error.message.includes('Lỗi Cloudflare')) {
            displayMessage = error.message.replace(/\(code: \d+\)/g, '');
        }
        
        showStatus(displayMessage, 'error');
        
        // Debug thêm trong console
        if (error.message.includes('Lỗi Cloudflare')) {
            console.group('Chi tiết lỗi Cloudflare');
            console.log('Worker ID:', currentWorker.id);
            console.log('Code length:', code.length);
            console.log('Error details:', error.message);
            console.groupEnd();
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