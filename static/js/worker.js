document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo CodeMirror editor
    const codeEditor = CodeMirror.fromTextArea(document.getElementById('code-editor'), {
        mode: 'javascript',
        theme: 'dracula',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        lineWrapping: true,
        extraKeys: {
            'Ctrl-Space': 'autocomplete'
        }
    });

    // Điều chỉnh chiều cao của editor
    window.addEventListener('resize', () => {
        codeEditor.setSize(null, '100%');
    });

    // Lấy tham chiếu đến các phần tử DOM
    const loginBtn = document.getElementById('login-btn');
    const passwordInput = document.getElementById('password');
    const statusDiv = document.getElementById('status');
    const workerListDiv = document.getElementById('worker-list');
    const workerSelectorDiv = document.querySelector('.worker-selector');
    const editorContainerDiv = document.querySelector('.editor-container');
    const currentWorkerSpan = document.querySelector('.editor-header h2 span');
    const updateBtn = document.getElementById('update-btn');
    const backBtn = document.getElementById('back-btn');

    // Biến toàn cục
    let currentWorkerId = null;
    let password = '';

    // Hàm hiển thị thông báo trạng thái
    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = isError ? 'status error' : 'status success';
        
        setTimeout(() => {
            statusDiv.className = 'status';
        }, 5000);
    }

    // Xử lý sự kiện nút "Đăng nhập"
    loginBtn.addEventListener('click', async () => {
        password = passwordInput.value.trim();
        
        if (!password) {
            showStatus('Vui lòng nhập mật khẩu', true);
            return;
        }
        
        try {
            loginBtn.disabled = true;
            loginBtn.textContent = 'Đang xác thực...';
            
            const response = await fetch(`/api/list-workers?password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể lấy danh sách worker');
            }
            
            const data = await response.json();
            renderWorkerList(data.workers);
            
            // Ẩn phần đăng nhập, hiển thị danh sách worker
            document.querySelector('.auth-section').style.display = 'none';
            workerSelectorDiv.style.display = 'block';
            
            showStatus('Đăng nhập thành công');
        } catch (error) {
            console.error('Error authenticating:', error);
            showStatus(`Lỗi: ${error.message}`, true);
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Đăng nhập';
        }
    });

    // Hiển thị danh sách worker
    function renderWorkerList(workers) {
        workerListDiv.innerHTML = '';
        
        if (workers.length === 0) {
            workerListDiv.innerHTML = '<p>Không tìm thấy worker nào.</p>';
            return;
        }
        
        workers.forEach(worker => {
            const workerCard = document.createElement('div');
            workerCard.className = 'worker-card';
            workerCard.innerHTML = `
                <h3>${worker.name}</h3>
                <p>ID: ${worker.id}</p>
                <p>Cập nhật: ${new Date(worker.lastModified).toLocaleString()}</p>
            `;
            
            workerCard.addEventListener('click', () => loadWorker(worker.id));
            
            workerListDiv.appendChild(workerCard);
        });
    }

    // Tải mã của worker được chọn
    async function loadWorker(workerId) {
        try {
            showStatus('Đang tải mã worker...');
            
            const response = await fetch(`/api/get-worker?worker_id=${encodeURIComponent(workerId)}&password=${encodeURIComponent(password)}`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể tải mã worker');
            }
            
            const data = await response.json();
            
            // Cập nhật UI
            currentWorkerId = workerId;
            currentWorkerSpan.textContent = workerId;
            codeEditor.setValue(data.code);
            
            // Chuyển đổi view
            workerSelectorDiv.style.display = 'none';
            editorContainerDiv.style.display = 'block';
            
            showStatus(`Đã tải mã worker ${workerId} thành công`);
        } catch (error) {
            console.error('Error loading worker:', error);
            showStatus(`Lỗi: ${error.message}`, true);
        }
    }

    // Xử lý sự kiện nút "Cập nhật Worker"
    updateBtn.addEventListener('click', async () => {
        if (!currentWorkerId) {
            showStatus('Không có worker nào được chọn', true);
            return;
        }
        
        const code = codeEditor.getValue();
        
        if (!code) {
            showStatus('Mã không được để trống', true);
            return;
        }
        
        try {
            updateBtn.disabled = true;
            updateBtn.textContent = 'Đang cập nhật...';
            
            const response = await fetch('/api/update-worker', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    code,
                    password,
                    workerId: currentWorkerId
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể cập nhật worker');
            }
            
            showStatus(`Đã cập nhật worker ${currentWorkerId} thành công`);
        } catch (error) {
            console.error('Error updating worker:', error);
            showStatus(`Lỗi: ${error.message}`, true);
        } finally {
            updateBtn.disabled = false;
            updateBtn.textContent = 'Cập nhật Worker';
        }
    });

    // Quay lại danh sách worker
    backBtn.addEventListener('click', () => {
        editorContainerDiv.style.display = 'none';
        workerSelectorDiv.style.display = 'block';
        currentWorkerId = null;
    });

    // Hỗ trợ đăng nhập bằng Enter
    passwordInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });
});