const CONFIG = {
    CLIENT_ID: 'Ov23lixtCFiQYWFH232n',
    REDIRECT_URI: 'https://storeios.net/.netlify/functions/callback',
    REPO_OWNER: 'chienlove',
    REPO_NAME: 'chienlove.github.io',
    MAX_FILE_SIZE: 2 * 1024 * 1024 * 1024, // 2GB in bytes
    CHUNK_SIZE: 10 * 1024 * 1024 // 10MB chunks for large files
};

class GitHubUploader {
    constructor() {
        this.token = localStorage.getItem('github_token');
        this.authWindow = null;
        this.uploadController = null;
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
            status: document.getElementById('status'),
            progressContainer: document.getElementById('progressContainer'),
            progressBar: document.getElementById('progressBar'),
            progressText: document.getElementById('progressText'),
            fileInfo: document.getElementById('fileInfo')
        };
    }

    attachEventListeners() {
        this.elements.loginButton.addEventListener('click', () => this.login());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadButton.addEventListener('click', () => this.handleUpload());
        window.addEventListener('message', (event) => this.handleOAuthCallback(event));
    }

    setStatus(message, type = 'info') {
        this.elements.status.className = `status ${type}`;
        this.elements.status.textContent = message;
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
        }
    }

    login() {
        const width = 600, height = 600;
        const left = (screen.width / 2) - (width / 2);
        const top = (screen.height / 2) - (height / 2);
        
        this.authWindow = window.open(
            `https://github.com/login/oauth/authorize?client_id=${CONFIG.CLIENT_ID}&redirect_uri=${CONFIG.REDIRECT_URI}&scope=repo`,
            'GitHub OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
        );
    }

    async handleOAuthCallback(event) {
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
                    if (this.authWindow) {
                        this.authWindow.close();
                    }
                } else {
                    throw new Error('Không nhận được access token');
                }
            } catch (error) {
                console.error('Lỗi khi lấy token:', error);
                this.setStatus(`Lấy token thất bại: ${error.message}`, 'error');
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
            Tệp đã chọn: ${file.name}<br>
            Kích thước: ${fileSize}<br>
            Loại: ${file.type || 'application/octet-stream'}
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
        if (!this.token) {
            this.setStatus('Vui lòng đăng nhập trước', 'error');
            return;
        }

        const file = this.elements.fileInput.files[0];
        if (!file) {
            this.setStatus('Vui lòng chọn tệp', 'error');
            return;
        }

        try {
            this.elements.uploadButton.disabled = true;
            this.setStatus('Đang tạo release...', 'info');
            this.updateProgress(0, 'Chuẩn bị tải lên...');
            
            const release = await this.createRelease();
            if (!release) throw new Error('Không thể tạo release');

            const uploadResult = await this.uploadFileToRelease(file, release.upload_url);
            
            this.elements.uploadButton.disabled = false;
            this.elements.fileInput.value = '';
            this.elements.fileInfo.style.display = 'none';
            this.updateProgress(100, 'Tải lên hoàn tất');
            
            // Thêm link tải xuống
            if (uploadResult && uploadResult.browser_download_url) {
                this.setStatus('Tải tệp lên thành công!', 'success');
                this.elements.status.innerHTML += `<br><a href="${uploadResult.browser_download_url}" class="download-link" target="_blank">Tải xuống tệp</a>`;
            } else {
                throw new Error('Tải lên thành công nhưng không có URL tải xuống');
            }
        } catch (error) {
            console.error('Lỗi tải lên:', error);
            this.setStatus(`Tải lên thất bại: ${error.message}`, 'error');
            this.elements.uploadButton.disabled = false;
            this.updateProgress(0, '');
        }
    }

    async createRelease() {
        try {
            const response = await fetch(`https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/releases`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: JSON.stringify({
                    tag_name: `v${Date.now()}`,
                    name: `Release ${new Date().toISOString()}`,
                    body: 'Tải lên thông qua giao diện web',
                    draft: false,
                    prerelease: false
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            return await response.json();
        } catch (error) {
            throw new Error(`Tạo release thất bại: ${error.message}`);
        }
    }

    async uploadFileToRelease(file, uploadUrl) {
        const finalUploadUrl = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
        
        this.uploadController = new AbortController();
        const signal = this.uploadController.signal;

        try {
            let result;
            if (file.size > CONFIG.CHUNK_SIZE) {
                result = await this.uploadLargeFile(file, finalUploadUrl, signal);
            } else {
                result = await this.uploadSmallFile(file, finalUploadUrl, signal);
            }
            return result;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Tải lên đã bị hủy bởi người dùng');
            }
            throw error;
        } finally {
            this.uploadController = null;
        }
    }

    async uploadSmallFile(file, uploadUrl, signal) {
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.token}`,
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': file.size.toString(),
                'Accept': 'application/vnd.github.v3+json'
            },
            body: file,
            signal: signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        this.updateProgress(100, 'Tải lên hoàn tất');
        return await response.json();
    }

    async uploadLargeFile(file, uploadUrl, signal) {
        const totalChunks = Math.ceil(file.size / CONFIG.CHUNK_SIZE);
        let uploadedChunks = 0;

        for (let start = 0; start < file.size; start += CONFIG.CHUNK_SIZE) {
            const chunk = file.slice(start, start + CONFIG.CHUNK_SIZE);
            const end = Math.min(start + CONFIG.CHUNK_SIZE - 1, file.size - 1);

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Content-Type': file.type || 'application/octet-stream',
                    'Content-Range': `bytes ${start}-${end}/${file.size}`,
                    'Accept': 'application/vnd.github.v3+json'
                },
                body: chunk,
                signal: signal
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            uploadedChunks++;
            const progress = Math.round((uploadedChunks / totalChunks) * 100);
            this.updateProgress(progress, `Đang tải lên... ${progress}%`);
        }

        this.updateProgress(100, 'Tải lên hoàn tất');
        return await (await fetch(uploadUrl, { method: 'GET', headers: { 'Authorization': `token ${this.token}` } })).json();
    }
}

// Khởi tạo uploader khi DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    new GitHubUploader();
});