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
        this.currentRelease = null;
        this.uploadXHR = null;
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
            fileInfo: document.getElementById('fileInfo'),
            releaseTypeRadios: document.querySelectorAll('input[name="releaseType"]'),
            existingReleases: document.getElementById('existingReleases'),
            newReleaseFields: document.getElementById('newReleaseFields'),
            releaseName: document.getElementById('releaseName'),
            releaseNotes: document.getElementById('releaseNotes'),
            releaseList: document.getElementById('releaseList')
        };
    }

    bindEvents() {
        this.elements.loginButton.addEventListener('click', () => this.login());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadButton.addEventListener('click', () => this.handleUpload());
        this.elements.cancelButton.addEventListener('click', () => this.cancelUpload());
        
        this.elements.releaseTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => this.toggleReleaseType());
        });
        
        this.elements.existingReleases.addEventListener('change', () => this.loadReleaseDetails());
        
        window.addEventListener('message', (e) => this.handleOAuthCallback(e));
    }

    toggleReleaseType() {
        const isNewRelease = document.querySelector('input[name="releaseType"]:checked').value === 'new';
        this.elements.newReleaseFields.classList.toggle('hidden', !isNewRelease);
    }

    checkAuth() {
        if (!this.token) {
            this.showLogin();
        } else {
            this.showUpload();
            this.loadReleases();
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
        this.elements.status.innerHTML = message;
    }

    updateProgress(percent, message = '') {
        if (!this.elements.progressText) {
            console.error('Progress text element not found');
            return;
        }
        
        this.elements.progressContainer.style.display = 'block';
        this.elements.progressBar.style.width = `${percent}%`;
        this.elements.progressText.textContent = message;
    }

    async loadReleases() {
        try {
            const response = await fetch(`https://api.github.com/repos/${this.config.REPO_OWNER}/${this.config.REPO_NAME}/releases`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load releases');
            
            const releases = await response.json();
            this.populateReleaseDropdown(releases);
            this.displayReleaseList(releases);
            
        } catch (error) {
            console.error('Error loading releases:', error);
            this.setStatus(`Error: ${error.message}`, 'error');
        }
    }

    populateReleaseDropdown(releases) {
        const select = this.elements.existingReleases;
        select.innerHTML = '<option value="">Select a release</option>';
        
        releases.forEach(release => {
            const option = document.createElement('option');
            option.value = release.id;
            option.textContent = release.name || release.tag_name;
            select.appendChild(option);
        });
    }

    displayReleaseList(releases) {
        const listContainer = this.elements.releaseList;
        listContainer.innerHTML = '';
        listContainer.classList.remove('hidden');
        
        releases.forEach(release => {
            const releaseItem = document.createElement('div');
            releaseItem.className = 'release-item';
            releaseItem.innerHTML = `
                <h3>${release.name || release.tag_name}</h3>
                <p>${release.body || 'No description'}</p>
                <div class="files-header">
                    <strong>Files (${release.assets.length}):</strong>
                </div>
            `;
            
            release.assets.forEach(asset => {
                const fileItem = document.createElement('div');
                fileItem.className = 'file-item';
                fileItem.innerHTML = `
                    <span>${asset.name}</span>
                    <span>${this.formatSize(asset.size)}</span>
                `;
                releaseItem.appendChild(fileItem);
            });
            
            listContainer.appendChild(releaseItem);
        });
    }

    async loadReleaseDetails() {
        const releaseId = this.elements.existingReleases.value;
        if (!releaseId) return;
        
        try {
            const response = await fetch(`https://api.github.com/repos/${this.config.REPO_OWNER}/${this.config.REPO_NAME}/releases/${releaseId}`, {
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) throw new Error('Failed to load release details');
            
            this.currentRelease = await response.json();
            
        } catch (error) {
            console.error('Error loading release:', error);
            this.setStatus(`Error: ${error.message}`, 'error');
        }
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
            this.setStatus('Preparing upload...', 'info');
            this.updateProgress(0, 'Starting...');
            this.elements.uploadButton.disabled = true;
            this.elements.cancelButton.classList.remove('hidden');

            // 1. Prepare release (create new or use existing)
            const release = await this.prepareRelease();
            this.updateProgress(30, 'Uploading file...');

            // 2. Upload file
            const result = await this.uploadFile(file, release.upload_url);
            
            // 3. Finalize
            this.updateProgress(100, 'Upload complete!');
            this.showSuccessMessage(release, result);
            
            // Refresh releases list
            this.loadReleases();
            
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Upload error:', error);
                this.setStatus(`Upload failed: ${error.message}`, 'error');
            }
        } finally {
            this.resetUpload();
        }
    }

    async prepareRelease() {
        const isNewRelease = document.querySelector('input[name="releaseType"]:checked').value === 'new';
        
        if (isNewRelease) {
            // Create new release
            const name = this.elements.releaseName.value || `Release ${new Date().toLocaleString()}`;
            const body = this.elements.releaseNotes.value || 'Uploaded via GitHub Uploader';
            
            const response = await fetch(`https://api.github.com/repos/${this.config.REPO_OWNER}/${this.config.REPO_NAME}/releases`, {
                method: 'POST',
                headers: {
                    'Authorization': `token ${this.token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    tag_name: `v${Date.now()}`,
                    name: name,
                    body: body,
                    draft: false,
                    prerelease: false
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.message || 'Failed to create release');
            }

            return await response.json();
        } else {
            // Use existing release
            if (!this.currentRelease) {
                throw new Error('Please select a release first');
            }
            return this.currentRelease;
        }
    }

    uploadFile(file, uploadUrl) {
        return new Promise((resolve, reject) => {
            const url = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
            this.uploadXHR = new XMLHttpRequest();
            
            this.uploadXHR.open('POST', url, true);
            this.uploadXHR.setRequestHeader('Authorization', `token ${this.token}`);
            this.uploadXHR.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
            this.uploadXHR.setRequestHeader('Accept', 'application/vnd.github.v3+json');

            this.uploadXHR.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percent = Math.round((e.loaded / e.total) * 70);
                    this.updateProgress(30 + percent, `Uploading: ${30 + percent}%`);
                }
            };

            this.uploadXHR.onload = () => {
                if (this.uploadXHR.status >= 200 && this.uploadXHR.status < 300) {
                    try {
                        resolve(JSON.parse(this.uploadXHR.responseText));
                    this.uploadXHR = null;
                    this.setStatus('File processing completed', 'info');
                    setTimeout(() => {
                        this.setStatus('Upload fully completed!', 'success');
                    }, 1000);
                    } catch {
                        resolve({ status: 'success' });
                    }
                } else {
                    reject(new Error(`Server responded with ${this.uploadXHR.status}`));
                }
            };

            this.uploadXHR.onerror = () => {
                if (this.uploadXHR.readyState !== 4) {
                    reject(new Error('Network error during upload'));
                }
            };

            this.uploadXHR.send(file);
        });
    }

    showSuccessMessage(release, uploadResult) {
        const releaseUrl = release.html_url;
        const downloadUrl = uploadResult.browser_download_url || 
                          `${releaseUrl}/assets/${this.elements.fileInput.files[0].name}`;
        
        this.setStatus(`
            <div class="upload-success">
                <h3>Upload Successful!</h3>
                <p>File has been uploaded to release: <strong>${release.name || release.tag_name}</strong></p>
                <div class="success-actions">
                    <a href="${releaseUrl}" target="_blank" class="btn btn-primary">View Release</a>
                    <a href="${downloadUrl}" target="_blank" class="btn btn-primary">Download File</a>
                </div>
            </div>
        `, 'success');
    }

    cancelUpload() {
        if (this.uploadXHR) {
            this.uploadXHR.abort();
        }
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
        }, 1500);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        new GitHubUploader();
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('status').textContent = `System error: ${error.message}`;
    }
});