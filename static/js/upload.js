const CONFIG = {
    CLIENT_ID: 'Ov23lixtCFiQYWFH232n',
    REDIRECT_URI: 'https://storeios.net/.netlify/functions/callback',
    REPO_OWNER: 'chienlove',
    REPO_NAME: 'chienlove.github.io',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024 // 2GB
};

class GitHubUploader {
    constructor() {
        this.token = localStorage.getItem('github_token');
        this.uploadAbortController = null;
        this.currentRelease = null;
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuth();
    }

    initializeElements() {
        this.elements = {
            loginButton: document.getElementById('loginButton'),
            loginSection: document.getElementById('loginSection'),
            uploadSection: document.getElementById('uploadSection'),
            fileInput: document.getElementById('fileInput'),
            uploadButton: document.getElementById('uploadButton'),
            cancelButton: document.getElementById('cancelButton'),
            status: document.getElementById('status'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            fileInfo: document.getElementById('fileInfo'),
            releaseSelector: document.getElementById('releaseSelector'),
            releaseNameInput: document.getElementById('releaseName'),
            releaseNotesInput: document.getElementById('releaseNotes'),
            fileTableBody: document.querySelector('#fileTable tbody')
        };
    }

    attachEventListeners() {
        this.elements.loginButton.addEventListener('click', () => this.login());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadButton.addEventListener('click', () => this.handleUpload());
        this.elements.cancelButton.addEventListener('click', () => this.cancelUpload());
        this.elements.releaseSelector.addEventListener('change', (e) => this.handleReleaseSelect(e));
        window.addEventListener('message', (event) => this.handleOAuthCallback(event));
    }

    setStatus(message, type = 'info') {
        this.elements.status.className = `status ${type}`;
        this.elements.status.innerHTML = message;
    }

    updateProgress(percentage, message = '') {
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = `${percentage}%`;
        this.elements.progressText.textContent = message;
    }

    checkAuth() {
        if (!this.token) {
            this.elements.loginSection.style.display = 'block';
            this.elements.uploadSection.style.display = 'none';
            this.setStatus('Vui lòng đăng nhập để tải tệp', 'info');
        } else {
            this.elements.loginSection.style.display = 'none';
            this.elements.uploadSection.style.display = 'block';
            this.setStatus('Sẵn sàng để tải tệp', 'info');
            this.loadReleases();
        }
    }

    async loadReleases() {
        try {
            const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/releases`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            const releases = await response.json();
            this.populateReleaseSelector(releases);
        } catch (error) {
            console.error('Error loading releases:', error);
        }
    }

    populateReleaseSelector(releases) {
        const selector = this.elements.releaseSelector;
        selector.innerHTML = '<option value="new">-- Tạo Release Mới --</option>';
        
        releases.forEach(release => {
            const option = document.createElement('option');
            option.value = release.id;
            option.textContent = release.name || release.tag_name;
            selector.appendChild(option);
        });
    }

    handleReleaseSelect(event) {
        const releaseId = event.target.value;
        if (releaseId === 'new') {
            this.elements.releaseNameInput.style.display = 'block';
            this.elements.releaseNotesInput.style.display = 'block';
        } else {
            this.elements.releaseNameInput.style.display = 'none';
            this.elements.releaseNotesInput.style.display = 'none';
        }
    }

    login() {
        const width = 600, height = 600;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        
        window.open(
            `https://github.com/login/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&scope=repo`,
            'GitHub OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    }

    async handleOAuthCallback(event) {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'oauth') {
            try {
                const response = await fetch('/.netlify/functions/get-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: event.data.code })
                });

                const data = await response.json();
                if (data.access_token) {
                    this.token = data.access_token;
                    localStorage.setItem('github_token', this.token);
                    this.checkAuth();
                    this.setStatus('Đăng nhập thành công', 'success');
                } else {
                    throw new Error('Không nhận được access token');
                }
            } catch (error) {
                this.setStatus(`Lỗi lấy token: ${error.message}`, 'error');
            }
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            this.setStatus(`Kích thước tệp vượt quá giới hạn 2GB`, 'error');
            this.elements.fileInput.value = '';
            return;
        }

        const fileSize = this.formatFileSize(file.size);
        this.elements.fileInfo.style.display = 'block';
        this.elements.fileInfo.innerHTML = `
            <strong>Tệp đã chọn:</strong> ${file.name}<br>
            <strong>Kích thước:</strong> ${fileSize}<br>
            <strong>Loại:</strong> ${file.type || 'Không xác định'}
        `;
    }

    formatFileSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    }

    async handleUpload() {
        const file = this.elements.fileInput.files[0];
        if (!file || !this.token) {
            this.setStatus('Vui lòng chọn tệp và đăng nhập', 'error');
            return;
        }

        try {
            this.elements.uploadButton.disabled = true;
            this.elements.cancelButton.style.display = 'inline-block';
            
            this.setStatus('Đang xử lý...', 'info');
            this.updateProgress(0, 'Chuẩn bị tải lên...');

            // Xác định release (tạo mới hoặc dùng có sẵn)
            const release = await this.prepareRelease();
            this.currentRelease = release;
            this.updateProgress(30, 'Đang upload file...');
            
            // Upload file
            const uploadResult = await this.uploadFileToRelease(file, release.upload_url);
            
            // Cập nhật UI
            this.updateProgress(100, 'Hoàn tất!');
            this.showSuccessMessage(release, uploadResult);
            this.resetForm();
            this.loadReleases(); // Refresh danh sách release
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Upload error:', error);
                this.setStatus(`Lỗi: ${error.message}`, 'error');
            }
            this.resetForm();
        }
    }

    async prepareRelease() {
        const selectedReleaseId = this.elements.releaseSelector.value;
        
        if (selectedReleaseId === 'new') {
            // Tạo release mới
            const releaseName = this.elements.releaseNameInput.value || `Release ${new Date().toLocaleString()}`;
            const releaseNotes = this.elements.releaseNotesInput.value || 'Tải lên từ web';
            
            const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/releases`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    tag_name: `v${Date.now()}`,
                    name: releaseName,
                    body: releaseNotes,
                    draft: false,
                    prerelease: false
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Tạo release thất bại`);
            }
            return await response.json();
        } else {
            // Lấy thông tin release có sẵn
            const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/releases/${selectedReleaseId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) throw new Error('Không thể lấy thông tin release');
            return await response.json();
        }
    }

    async uploadFileToRelease(file, uploadUrl) {
        const finalUrl = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
        
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', finalUrl, true);
            xhr.setRequestHeader('Authorization', `token ${this.token}`);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 70); // 70% cho upload
                    this.updateProgress(30 + percentComplete, `Đang tải lên: ${Math.round((30 + percentComplete))}%`);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = xhr.responseText ? JSON.parse(xhr.responseText) : { status: 'success' };
                        resolve(response);
                    } catch {
                        resolve({ status: 'success' }); // GitHub đôi khi trả về response trống
                    }
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                if (xhr.readyState !== 4) {
                    reject(new Error('Lỗi kết nối'));
                }
            };

            xhr.send(file);
        });
    }

    showSuccessMessage(release, uploadResult) {
        const releaseUrl = release.html_url;
        const downloadUrl = uploadResult.browser_download_url || 
                          `${releaseUrl}/assets/${this.elements.fileInput.files[0].name}`;
        
        this.setStatus(`
            <div class="upload-success">
                <h4>🎉 Tải lên thành công!</h4>
                <div class="success-actions">
                    <a href="${releaseUrl}" target="_blank" class="btn btn-view">Xem Release</a>
                    <a href="${downloadUrl}" target="_blank" class="btn btn-download">Tải Xuống</a>
                </div>
            </div>
        `, 'success');
    }

    cancelUpload() {
        if (this.uploadAbortController) {
            this.uploadAbortController.abort();
        }
        this.setStatus('Đã hủy tải lên', 'info');
        this.resetForm();
    }

    resetForm() {
        this.elements.uploadButton.disabled = false;
        this.elements.cancelButton.style.display = 'none';
        this.elements.fileInput.value = '';
        this.elements.fileInfo.style.display = 'none';
        this.updateProgress(0, '');
    }
}

document.addEventListener('DOMContentLoaded', () => new GitHubUploader());