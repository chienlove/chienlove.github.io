document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo CodeMirror editor
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
        styleActiveLine: true
    });

    // DOM Elements
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
        backBtn: document.getElementById('back-btn')
    };

    // Global State
    let currentWorker = {
        id: null,
        name: '',
        lastModified: ''
    };
    let password = '';

    // Hiển thị thông báo
    function showStatus(message, type = 'success', duration = 5000) {
        const status = elements.statusMessage;
        status.textContent = message;
        status.className = `status-message ${type} show`;
        
        clearTimeout(status.timeout);
        status.timeout = setTimeout(() => {
            status.classList.remove('show');
        }, duration);
    }

    // Xử lý đăng nhập
    elements.loginBtn.addEventListener('click', handleLogin);
    elements.passwordInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleLogin());

    async function handleLogin() {
        password = elements.passwordInput.value.trim();
        
        if (!password) {
            showStatus('Vui lòng nhập mật khẩu', 'error');
            return;
        }
        
        try {
            setLoading(elements.loginBtn, true, 'Đang xác thực...');
            
            const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
            const data = await handleResponse(response);
            
            renderWorkerList(data.workers);
            elements.authSection.style.display = 'none';
            elements.workerSelectorDiv.style.display = 'block';
            
            showStatus('Đăng nhập thành công');
        } catch (error) {
            showStatus(error.message, 'error');
            console.error('Login Error:', error);
        } finally {
            setLoading(elements.loginBtn, false, 'Đăng nhập');
        }
    }

    // Hiển thị danh sách worker
    function renderWorkerList(workers) {
        elements.workerListDiv.innerHTML = workers.length ? 
            workers.map(worker => `
                <div class="worker-card" onclick="loadWorker('${worker.id}')">
                    <h3>${worker.name || worker.id}</h3>
                    <p>ID: ${worker.id}</p>
                    <p>Cập nhật: ${formatDate(worker.lastModified)}</p>
                </div>
            `).join('') : 
            '<div class="empty-state">Không tìm thấy worker nào</div>';
    }

    // Tải worker
    async function loadWorker(workerId) {
        try {
            showStatus('Đang tải worker...', 'info');
            
            const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
            const data = await handleResponse(response);
            
            currentWorker = {
                id: workerId,
                name: data.name || workerId,
                lastModified: data.lastModified
            };
            
            updateUIForEditor(data.code);
            showStatus(`Đã tải worker "${currentWorker.name}"`, 'success');
        } catch (error) {
            showStatus(error.message, 'error');
            console.error('Load Worker Error:', error);
        }
    }

    // Cập nhật UI editor
    function updateUIForEditor(code) {
        elements.currentWorkerName.textContent = currentWorker.name;
        elements.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
        codeEditor.setValue(code);
        elements.workerSelectorDiv.style.display = 'none';
        elements.editorContainerDiv.style.display = 'block';
    }

    // Xử lý cập nhật worker
    elements.updateBtn.addEventListener('click', updateWorker);

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
        
        try {
            setLoading(elements.updateBtn, true, 'Đang cập nhật...');
            
            const response = await fetch('/api/update-worker', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code: code,
                    password: password,
                    workerId: currentWorker.id
                })
            });
            
            const data = await handleResponse(response);
            currentWorker.lastModified = data.lastModified || new Date().toISOString();
            elements.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
            
            showStatus(`✅ Đã cập nhật "${currentWorker.name}"`, 'success');
        } catch (error) {
            showStatus(`❌ ${error.message}`, 'error');
            console.error('Update Error:', error);
        } finally {
            setLoading(elements.updateBtn, false, 'Cập nhật');
        }
    }

    // Helper functions
    async function handleResponse(response) {
        const data = await response.json();
        if (!response.ok) {
            const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
            throw new Error(errorMsg);
        }
        return data;
    }

    function setLoading(element, isLoading, text = '') {
        element.disabled = isLoading;
        if (isLoading) {
            element.dataset.originalText = element.textContent;
            element.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        } else {
            element.textContent = element.dataset.originalText || text;
        }
    }

    function formatDate(dateString) {
        return dateString ? new Date(dateString).toLocaleString('vi-VN') : 'Chưa rõ';
    }

    // Quay lại danh sách
    elements.backBtn.addEventListener('click', () => {
        elements.editorContainerDiv.style.display = 'none';
        elements.workerSelectorDiv.style.display = 'block';
    });

    // Xử lý resize
    window.addEventListener('resize', () => codeEditor.refresh());
});