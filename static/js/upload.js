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
            this.setStatus('Please log in to upload files', 'info');
        } else {
            this.elements.loginSection.style.display = 'none';
            this.elements.uploadSection.style.display = 'block';
            this.setStatus('Ready to upload', 'info');
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
                    this.setStatus('Login successful', 'success');
                    if (this.authWindow) {
                        this.authWindow.close();
                    }
                }
            } catch (error) {
                console.error('Token acquisition error:', error);
                this.setStatus('Failed to get access token', 'error');
            }
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            this.setStatus(`File size exceeds the maximum limit of 2GB`, 'error');
            this.elements.fileInput.value = '';
            return;
        }

        const fileSize = this.formatFileSize(file.size);
        this.elements.fileInfo.style.display = 'block';
        this.elements.fileInfo.innerHTML = `
            Selected file: ${file.name}<br>
            Size: ${fileSize}<br>
            Type: ${file.type || 'application/octet-stream'}
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
            this.setStatus('Please log in first', 'error');
            return;
        }

        const file = this.elements.fileInput.files[0];
        if (!file) {
            this.setStatus('Please select a file', 'error');
            return;
        }

        try {
            this.elements.uploadButton.disabled = true;
            this.setStatus('Creating release...', 'info');
            
            const release = await this.createRelease();
            if (!release) throw new Error('Failed to create release');

            await this.uploadFileToRelease(file, release.upload_url);
            
            this.elements.uploadButton.disabled = false;
            this.elements.fileInput.value = '';
            this.elements.fileInfo.style.display = 'none';
        } catch (error) {
            console.error('Upload error:', error);
            this.setStatus(`Upload failed: ${error.message}`, 'error');
            this.elements.uploadButton.disabled = false;
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
                    body: 'Uploaded via web interface',
                    draft: false,
                    prerelease: false
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            return await response.json();
        } catch (error) {
            throw new Error(`Release creation failed: ${error.message}`);
        }
    }

    async uploadFileToRelease(file, uploadUrl) {
        // Remove template parameters from upload URL
        const finalUploadUrl = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
        
        this.uploadController = new AbortController();
        const signal = this.uploadController.signal;

        try {
            const response = await fetch(finalUploadUrl, {
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

            if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            
            const data = await response.json();
            this.setStatus('File uploaded successfully!', 'success');
            
            // Add download link
            const downloadUrl = data.browser_download_url;
            if (downloadUrl) {
                this.elements.status.innerHTML += `<br><a href="${downloadUrl}" class="download-link" target="_blank">Download File</a>`;
            }
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Upload cancelled by user');
            }
            throw error;
        } finally {
            this.uploadController = null;
        }
    }
}

// Initialize uploader when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GitHubUploader();
});