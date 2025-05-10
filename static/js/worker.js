// Global variables
let codeEditor;
let currentWorker = {
    id: null,
    name: '',
    lastModified: null
};
let password = '';
let workers = [];

// Initialize editor
function initEditor() {
    const editorContainer = document.getElementById('code-editor-container');
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'editor-wrapper';
    editorContainer.appendChild(editorWrapper);
    
    // Sử dụng lại shortcuts mặc định của editor
    // đặc biệt là Ctrl-A/Cmd-A để chọn tất cả
    codeEditor = CodeMirror(editorWrapper, {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4
    });
    
    // Thêm phím tắt riêng sau khi tạo editor
    codeEditor.setOption('extraKeys', {
        'Ctrl-Enter': function() { updateWorker(); },
        'Cmd-Enter': function() { updateWorker(); },
        'Ctrl-/': 'toggleComment',
        'Cmd-/': 'toggleComment'
        // Không định nghĩa lại Ctrl-A/Cmd-A để sử dụng hành vi mặc định
    });

    function resizeEditor() {
        const height = window.innerHeight - editorContainer.getBoundingClientRect().top - 20;
        editorWrapper.style.height = `${height}px`;
        codeEditor.setSize('100%', '100%');
        codeEditor.refresh();
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
        // Lưu trạng thái ban đầu
        element.dataset.originalText = element.textContent;
        
        // Tạo spinner mới thay vì sử dụng icon có sẵn
        element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    } else {
        // Khôi phục trạng thái ban đầu
        element.textContent = element.dataset.originalText || text;
    }
}

function formatDate(dateString) {
    if (!dateString) return 'Chưa rõ';
    
    try {
        // Xử lý kiểm tra hợp lệ
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            console.log('Invalid date string:', dateString);
            return 'Chưa rõ';
        }
        
        // Đảm bảo format ngày tháng đúng 
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit', 
            day: '2-digit',
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'Chưa rõ';
    }
}

// API functions
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
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Đăng nhập thất bại');

        workers = data.workers || [];
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

        // Đảm bảo lastModified là một chuỗi thời gian hợp lệ
        let lastModified = null;
        if (data.lastModified) {
            const testDate = new Date(data.lastModified);
            if (!isNaN(testDate.getTime())) {
                lastModified = data.lastModified;
            } else {
                console.warn('Server trả về lastModified không hợp lệ:', data.lastModified);
                // Sử dụng thời gian hiện tại nếu lastModified không hợp lệ
                lastModified = new Date().toISOString();
            }
        } else {
            // Nếu không có lastModified, sử dụng thời gian hiện tại
            lastModified = new Date().toISOString();
        }

        currentWorker = {
            id: workerId,
            name: data.name || workerId,
            lastModified: lastModified
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workerId: currentWorker.id,
                password: password,
                code: code,
                name: currentWorker.name
            })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Cập nhật thất bại');

        // Đảm bảo lastModified luôn hợp lệ
        let newLastModified;
        if (data.lastModified) {
            const testDate = new Date(data.lastModified);
            if (!isNaN(testDate.getTime())) {
                newLastModified = data.lastModified;
            } else {
                console.warn('Server trả về lastModified không hợp lệ khi cập nhật:', data.lastModified);
                newLastModified = new Date().toISOString();
            }
        } else {
            newLastModified = new Date().toISOString();
        }
        
        currentWorker.lastModified = newLastModified;
        document.getElementById('last-modified').textContent = formatDate(currentWorker.lastModified);
        showStatus('Cập nhật thành công!', 'success');
    } catch (error) {
        showStatus(error.message.includes('Failed to fetch') 
            ? 'Không thể kết nối đến server' 
            : error.message, 'error');
        console.error('Update Error:', error);
    } finally {
        setLoading(updateBtn, false, 'Lưu thay đổi');
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
    
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('update-btn').addEventListener('click', updateWorker);
    document.getElementById('back-btn').addEventListener('click', backToList);
    document.getElementById('password').addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
});