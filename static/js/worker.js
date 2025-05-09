document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo CodeMirror editor với cấu hình đầy đủ
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 4,
        tabSize: 4,
        extraKeys: {
            'Ctrl-A': 'selectAll',
            'Cmd-A': 'selectAll',
            'Ctrl-Space': 'autocomplete',
            'Ctrl-Enter': () => updateWorker(),
            'Cmd-Enter': () => updateWorker()
        },
        styleActiveLine: true,
        foldGutter: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    // Các phần tử DOM
    const elements = {
        loginBtn: document.getElementById('login-btn'),
        passwordInput: document.getElementById('password'),
        statusMessage: document.getElementById('status-message'),
        workerListDiv: document.getElementById('worker-list'),
        workerSelectorDiv: document.getElementById('worker-selector'),
        editorContainerDiv: document.getElementById('editor-container'),
        currentWorkerName: document.getElementById('current-worker-name'),
        lastModified: document.getElementById('last-modified'),
        updateBtn: document.getElementById('update-btn'),
        backBtn: document.getElementById('back-btn'),
        authSection: document.getElementById('auth-section'),
        workerSearch: document.getElementById('worker-search')
    };

    // Biến toàn cục
    let currentWorker = {
        id: null,
        name: '',
        lastModified: ''
    };
    let password = '';
    let workers = [];

    // Hiển thị thông báo
    function showStatus(message, type = 'success', duration = 5000) {
        elements.statusMessage.textContent = message;
        elements.statusMessage.className = `status-message show ${type}`;
        
        setTimeout(() => {
            elements.statusMessage.classList.remove('show');
        }, duration);
    }

    // Xử lý đăng nhập
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.passwordInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    async function handleLogin() {
        password = elements.passwordInput.value.trim();
        
        if (!password) {
            showStatus('Vui lòng nhập mật khẩu', 'error');
            return;
        }
        
        try {
            setLoading(elements.loginBtn, true);
            
            const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Đăng nhập thất bại');
            }
            
            const data = await response.json();
            workers = data.workers;
            renderWorkerList(workers);
            
            elements.authSection.style.display = 'none';
            elements.workerSelectorDiv.style.display = 'block';
            
            showStatus('Đăng nhập thành công');
        } catch (error) {
            console.error('Login error:', error);
            showStatus(error.message, 'error');
        } finally {
            setLoading(elements.loginBtn, false);
        }
    }

    // Hiển thị danh sách worker
    function renderWorkerList(workers) {
        elements.workerListDiv.innerHTML = '';
        
        if (workers.length === 0) {
            elements.workerListDiv.innerHTML = '<div class="empty-state">Không tìm thấy worker nào</div>';
            return;
        }
        
        workers.forEach(worker => {
            const card = document.createElement('div');
            card.className = 'worker-card fade-in';
            card.innerHTML = `
                <h3>${worker.name || worker.id}</h3>
                <p>ID: ${worker.id}</p>
                <p>Cập nhật: ${formatDate(worker.lastModified)}</p>
            `;
            card.addEventListener('click', () => loadWorker(worker));
            elements.workerListDiv.appendChild(card);
        });
    }

    // Tải worker
    async function loadWorker(worker) {
        try {
            showStatus('Đang tải worker...', 'info');
            
            const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(worker.id)}&password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Không thể tải worker');
            }
            
            const data = await response.json();
            
            currentWorker = {
                id: worker.id,
                name: worker.name || worker.id,
                lastModified: worker.lastModified
            };
            
            updateUIForEditor(data.code);
            showStatus(`Đã tải worker "${currentWorker.name}"`, 'success');
        } catch (error) {
            console.error('Load worker error:', error);
            showStatus(error.message, 'error');
        }
    }

    // Cập nhật UI khi vào chế độ editor
    function updateUIForEditor(code) {
        elements.currentWorkerName.textContent = currentWorker.name;
        elements.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
        codeEditor.setValue(code);
        elements.workerSelectorDiv.style.display = 'none';
        elements.editorContainerDiv.style.display = 'flex';
        codeEditor.refresh();
    }

    // Xử lý cập nhật worker
    elements.updateBtn.addEventListener('click', updateWorker);

    async function updateWorker() {
        if (!currentWorker.id) {
            showStatus('Không có worker được chọn', 'error');
            return;
        }
        
        const code = codeEditor.getValue();
        if (!code.trim()) {
            showStatus('Mã worker không được để trống', 'error');
            return;
        }
        
        try {
            setLoading(elements.updateBtn, true);
            
            const response = await fetch('/api/update-worker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    password: password,
                    workerId: currentWorker.id
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Cập nhật thất bại');
            }
            
            // Cập nhật thời gian sửa đổi
            currentWorker.lastModified = new Date().toISOString();
            elements.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
            
            showStatus(`Đã cập nhật worker "${currentWorker.name}" thành công`, 'success');
        } catch (error) {
            console.error('Update error:', error);
            showStatus(error.message, 'error');
        } finally {
            setLoading(elements.updateBtn, false);
        }
    }

    // Quay lại danh sách
    elements.backBtn.addEventListener('click', () => {
        elements.editorContainerDiv.style.display = 'none';
        elements.workerSelectorDiv.style.display = 'block';
        currentWorker.id = null;
    });

    // Tìm kiếm worker
    elements.workerSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = workers.filter(worker => 
            (worker.name && worker.name.toLowerCase().includes(searchTerm)) || 
            worker.id.toLowerCase().includes(searchTerm)
        );
        renderWorkerList(filtered);
    });

    // Helper functions
    function setLoading(button, isLoading) {
        button.disabled = isLoading;
        if (isLoading) {
            button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${button.textContent}`;
        } else {
            const icon = button === elements.loginBtn ? 'sign-in-alt' : 'save';
            button.innerHTML = `<i class="fas fa-${icon}"></i> ${button.textContent}`;
        }
    }

    function formatDate(dateString) {
        if (!dateString) return 'Không rõ';
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN');
    }

    // Điều chỉnh kích thước editor khi resize
    window.addEventListener('resize', () => {
        codeEditor.refresh();
    });
});