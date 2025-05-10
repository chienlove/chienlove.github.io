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
    
    codeEditor = CodeMirror(editorWrapper, {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        extraKeys: {
            'Ctrl-Enter': function() { updateWorker(); },
            'Cmd-Enter': function() { updateWorker(); },
            'Ctrl-/': 'toggleComment',
            'Cmd-/': 'toggleComment'
        }
    });
    
    // Thêm sự kiện keydown trực tiếp để xử lý Ctrl-A/Cmd-A
    codeEditor.getWrapperElement().addEventListener('keydown', function(e) {
        // Ctrl+A hoặc Cmd+A (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault(); // Ngăn hành vi mặc định
            codeEditor.execCommand('selectAll');
        }
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

// Không dùng hàm này nữa vì xử lý trực tiếp trong từng trường hợp

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
    
    // Đảm bảo mỗi worker có lastModified hợp lệ
    const processedWorkers = workers.map(worker => {
        // Clone để không làm thay đổi dữ liệu gốc
        const processedWorker = {...worker};
        
        // Kiểm tra và sửa lastModified nếu cần
        if (!processedWorker.lastModified) {
            console.log(`Worker ${processedWorker.id} không có lastModified`);
            // Không gán thời gian hiện tại cho danh sách
            processedWorker._formattedDate = 'Chưa rõ';
        } else {
            try {
                const testDate = new Date(processedWorker.lastModified);
                if (isNaN(testDate.getTime())) {
                    console.log(`Worker ${processedWorker.id} có lastModified không hợp lệ: ${processedWorker.lastModified}`);
                    processedWorker._formattedDate = 'Chưa rõ';
                } else {
                    processedWorker._formattedDate = testDate.toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit'
                    });
                }
            } catch (e) {
                console.error(`Lỗi xử lý ngày tháng cho worker ${processedWorker.id}:`, e);
                processedWorker._formattedDate = 'Chưa rõ';
            }
        }
        
        return processedWorker;
    });
    
    container.innerHTML = processedWorkers.length ? processedWorkers.map(worker => `
        <div class="worker-card" onclick="loadWorker('${worker.id}')">
            <h3><i class="fas fa-cube"></i> ${worker.name || worker.id}</h3>
            <p><i class="fas fa-fingerprint"></i> ID: ${worker.id}</p>
            <p><i class="far fa-clock"></i> Cập nhật: ${worker._formattedDate}</p>
        </div>
    `).join('') : '<div class="empty-state"><i class="fas fa-inbox"></i> Không tìm thấy worker nào</div>';
}

window.loadWorker = async function(workerId) {
    try {
        showStatus('Đang tải worker...', 'info');
        const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error || 'Không thể tải worker');

        // Xử lý ngày tháng cho worker được chọn
        let formattedDate = 'Chưa rõ';
        let lastModified = null;
        
        if (data.lastModified) {
            try {
                const testDate = new Date(data.lastModified);
                if (!isNaN(testDate.getTime())) {
                    lastModified = data.lastModified;
                    formattedDate = testDate.toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } else {
                    console.warn('Server trả về lastModified không hợp lệ:', data.lastModified);
                    // Không gán thời gian hiện tại, giữ là null
                }
            } catch (e) {
                console.error('Lỗi xử lý ngày tháng cho worker:', e);
            }
        }

        currentWorker = {
            id: workerId,
            name: data.name || workerId,
            lastModified: lastModified // Có thể null
        };

        codeEditor.setValue(data.code || '');
        codeEditor.refresh();
        document.getElementById('current-worker-name').textContent = currentWorker.name;
        document.getElementById('last-modified').textContent = formattedDate;
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

        // Xử lý ngày tháng trả về
        let formattedDate = 'Chưa rõ';
        let lastModified = null;
        
        if (data.lastModified) {
            try {
                const testDate = new Date(data.lastModified);
                if (!isNaN(testDate.getTime())) {
                    lastModified = data.lastModified;
                    formattedDate = testDate.toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit',
                        second: '2-digit'
                    });
                } else {
                    console.warn('Server trả về lastModified không hợp lệ khi cập nhật:', data.lastModified);
                }
            } catch (e) {
                console.error('Lỗi xử lý ngày tháng khi cập nhật:', e);
            }
        } else {
            console.log('Server không trả về lastModified khi cập nhật');
        }
        
        // Lưu giá trị gốc (có thể null)
        currentWorker.lastModified = lastModified;
        
        // Hiển thị ngày đã xử lý
        document.getElementById('last-modified').textContent = formattedDate;
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