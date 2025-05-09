document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo CodeMirror với cấu hình đầy đủ
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
            'Ctrl-A': function(cm) {
                cm.execCommand("selectAll");
            },
            'Cmd-A': function(cm) {
                cm.execCommand("selectAll");
            },
            'Ctrl-Enter': () => updateWorker(),
            'Cmd-Enter': () => updateWorker(),
            'Ctrl-Space': 'autocomplete'
        },
        styleActiveLine: true,
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"]
    });

    // Các phần tử DOM
    const dom = {
        loginBtn: document.getElementById('login-btn'),
        passwordInput: document.getElementById('password'),
        status: document.getElementById('status-message'),
        workerList: document.getElementById('worker-list'),
        workerSelector: document.getElementById('worker-selector'),
        editorContainer: document.getElementById('editor-container'),
        currentWorkerName: document.getElementById('current-worker-name'),
        lastModified: document.getElementById('last-modified'),
        updateBtn: document.getElementById('update-btn'),
        backBtn: document.getElementById('back-btn')
    };

    // State
    let currentWorker = {
        id: null,
        name: '',
        lastModified: null
    };
    let password = '';

    // Hiển thị thông báo
    function showStatus(message, isError = false) {
        dom.status.textContent = message;
        dom.status.className = `status-message ${isError ? 'error' : 'success'} show`;
        setTimeout(() => dom.status.classList.remove('show'), 5000);
    }

    // Xử lý đăng nhập
    dom.loginBtn.addEventListener('click', handleLogin);
    dom.passwordInput.addEventListener('keyup', (e) => e.key === 'Enter' && handleLogin());

    async function handleLogin() {
        password = dom.passwordInput.value.trim();
        if (!password) {
            showStatus('Vui lòng nhập mật khẩu', true);
            return;
        }

        try {
            setLoading(dom.loginBtn, true);
            const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Đăng nhập thất bại');
            }

            const data = await response.json();
            renderWorkerList(data.workers);
            dom.workerSelector.style.display = 'block';
            showStatus('Đăng nhập thành công');
        } catch (error) {
            showStatus(error.message, true);
            console.error('Login error:', error);
        } finally {
            setLoading(dom.loginBtn, false);
        }
    }

    // Hiển thị danh sách worker
    function renderWorkerList(workers) {
        dom.workerList.innerHTML = workers.length ? 
            workers.map(worker => `
                <div class="worker-card" onclick="loadWorker('${worker.id}')">
                    <h3>${worker.name || worker.id}</h3>
                    <p>ID: ${worker.id}</p>
                    <p>Cập nhật: ${formatDate(worker.lastModified)}</p>
                </div>
            `).join('') : '<p class="empty">Không tìm thấy worker nào</p>';
    }

    // Tải worker
    async function loadWorker(workerId) {
        try {
            showStatus('Đang tải worker...');
            const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Tải worker thất bại');
            }

            const data = await response.json();
            currentWorker = {
                id: workerId,
                name: data.name || workerId,
                lastModified: data.lastModified
            };

            updateEditorUI(data.code);
            showStatus(`Đã tải worker ${currentWorker.name}`);
        } catch (error) {
            showStatus(error.message, true);
            console.error('Load error:', error);
        }
    }

    // Cập nhật giao diện editor
    function updateEditorUI(code) {
        dom.currentWorkerName.textContent = currentWorker.name;
        dom.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
        codeEditor.setValue(code);
        dom.workerSelector.style.display = 'none';
        dom.editorContainer.style.display = 'block';
        codeEditor.refresh();
    }

    // Cập nhật worker
    dom.updateBtn.addEventListener('click', updateWorker);

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

        try {
            setLoading(dom.updateBtn, true);
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
            dom.lastModified.textContent = `Cập nhật lần cuối: ${formatDate(currentWorker.lastModified)}`;
            showStatus('Cập nhật thành công!');
        } catch (error) {
            showStatus(error.message, true);
            console.error('Update error:', error);
        } finally {
            setLoading(dom.updateBtn, false);
        }
    }

    // Helper functions
    function setLoading(element, isLoading, text = '') {
        element.disabled = isLoading;
        element.innerHTML = isLoading 
            ? `<i class="fas fa-spinner fa-spin"></i> ${text}`
            : text || element.dataset.originalText;
    }

    function formatDate(dateString) {
        return dateString ? new Date(dateString).toLocaleString('vi-VN') : 'Chưa rõ';
    }

    // Quay lại danh sách
    dom.backBtn.addEventListener('click', () => {
        dom.editorContainer.style.display = 'none';
        dom.workerSelector.style.display = 'block';
    });

    // Xử lý resize
    window.addEventListener('resize', () => codeEditor.refresh());
});