class GitHubUploader {
    constructor() {
        this.config = {
            CLIENT_ID: 'Ov23lixtCFiQYWFH232n',
            REDIRECT_URI: 'https://storeios.net/.netlify/functions/callback',
            REPO_OWNER: 'chienlove',
            REPO_NAME: 'chienlove.github.io',
            MAX_SIZE: 2 * 1024 * 1024 * 1024 // 2GB
        };
        
        this.token = localStorage.getItem('github_token');
        this.initialize();
    }

    initialize() {
        this.cacheElements();
        this.bindEvents();
        this.checkAuth();
    }

    cacheElements() {
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
            fileInfo: document.getElementById('fileInfo')
        };
        
        // Debug: Kiểm tra elements
        console.log('Cached elements:', this.elements);
    }

    bindEvents() {
        this.elements.loginButton.addEventListener('click', () => this.login());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadButton.addEventListener('click', () => this.handleUpload());
        this.elements.cancelButton.addEventListener('click', () => this.cancelUpload());
        window.addEventListener('message', (e) => this.handleOAuthCallback(e));
    }

    checkAuth() {
        if (!this.token) {
            this.showLogin();
        } else {
            this.showUpload();
        }
    }

    showLogin() {
        this.elements.loginSection.classList.remove('hidden');
        this.elements.uploadSection.classList.add('hidden');
        this.setStatus('Please login with GitHub', 'info');
    }

    showUpload() {
        this.elements.loginSection.classList.add('hidden');
        this.elements.uploadSection.classList.remove('hidden');
        this.setStatus('Ready to upload files (max 2GB)', 'info');
    }

    setStatus(message, type = 'info') {
        this.elements.status.className = `status-${type}`;
        this.elements.status.textContent = message;
    }

    updateProgress(percent, message = '') {
        if (!this.elements.progressText) {
            console.error('Progress text element missing');
            return;
        }
        
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = message;
    }

    login() {
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${this.config.CLIENT_ID}&redirect_uri=${this.config.REDIRECT_URI}&scope=repo`;
        const windowFeatures = 'width=600,height=600,left=100,top=100';
        window.open(authUrl, 'GitHubAuth', windowFeatures);
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
                    this.setStatus('Login successful!', 'success');
                } else {
                    throw new Error(data.error || 'Failed to get access token');
                }
            } catch (error) {
                this.setStatus(`Login failed: ${error.message}`, 'error');
            }
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > this.config.MAX_SIZE) {
            this.setStatus(`File too large (max ${this.formatSize(this.config.MAX_SIZE)})`, 'error');
            event.target.value = '';
            return;
        }

        this.elements.fileInfo.classList.remove('hidden');
        this.elements.fileInfo.innerHTML = `
            <strong>File:</strong> ${file.name}<br>
            <strong>Size:</strong> ${this.formatSize(file.size)}<br>
            <strong>Type:</strong> ${file.type || 'Unknown'}
        `;
    }

    formatSize(bytes) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unit = 0;
        
        while (size >= 1024 && unit < units.length - 1) {
            size /= 1024;
            unit++;
        }
        
        return `${size.toFixed(2)} ${units[unit]}`;
    }

    async handleUpload() {
        const file = this.elements.fileInput.files[0];
        if (!file) {
            this.setStatus('Please select a file first', 'error');
            return;
        }

        try {
            this.setStatus('Creating release...', 'info');
            this.updateProgress(0, 'Starting upload...');
            this.elements.uploadButton.disabled = true;
            this.elements.cancelButton.classList.remove('hidden');

            // 1. Tạo release
            const release = await this.createRelease();
            this.updateProgress(30, 'Uploading file...');

            // 2. Upload file
            const result = await this.uploadFile(file, release.upload_url);
            
            // 3. Hoàn thành
            this.updateProgress(100, 'Upload complete!');
            this.setStatus(`Upload successful! Download: ${result.browser_download_url}`, 'success');
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Upload error:', error);
                this.setStatus(`Upload failed: ${error.message}`, 'error');
            }
        } finally {
            this.resetUpload();
        }
    }

    async createRelease() {
        const response = await fetch(`https://api.github.com/repos/${this.config.REPO_OWNER}/${this.config.REPO_NAME}/releases`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${this.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag_name: `release-${Date.now()}`,
                name: `Release ${new Date().toLocaleString()}`,
                body: 'Uploaded via GitHub Uploader',
                draft: false,
                prerelease: false
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || 'Failed to create release');
        }

        return await response.json();
    }

    uploadFile(file, uploadUrl) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const url = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
            
            xhr.open('POST', url, true);
            xhr.setRequestHeader('Authorization', `token ${this.token}`);
            xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            xhr.setRequestHeader('Accept', 'application/vnd.github.v3+json');

            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 70);
                    this.updateProgress(30 + percent, `Uploading: ${30 + percent}%`);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        resolve(JSON.parse(xhr.responseText));
                    } catch {
                        resolve({ status: 'success' });
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

            xhr.send(file);
        });
    }

    cancelUpload() {
        this.setStatus('Upload cancelled', 'info');
        this.resetUpload();
    }

    resetUpload() {
        this.elements.uploadButton.disabled = false;
        this.elements.cancelButton.classList.add('hidden');
        this.elements.fileInput.value = '';
        this.elements.fileInfo.classList.add('hidden');
        setTimeout(() => {
            this.updateProgress(0, '');
        }, 1000);
    }
}

// Khởi tạo khi DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    try {
        new GitHubUploader();
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('status').textContent = `System error: ${error.message}`;
    }
});