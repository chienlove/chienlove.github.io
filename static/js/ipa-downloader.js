// static/js/ipa-downloader.js

class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.render();
    this.attachEventListeners();
    this.isWaitingFor2FA = false; // Thêm trạng thái 2FA
  }

  render() {
    this.container.innerHTML = `
      <div class="ipa-downloader-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Apple ID Login</h3>
            <p class="card-description">Enter your Apple ID to download IPA files</p>
          </div>
          <div class="card-content">
            <form id="login-form" class="login-form">
              <div class="form-group">
                <input 
                  type="email" 
                  id="apple-id" 
                  placeholder="Apple ID" 
                  class="input-field" 
                  required
                />
              </div>
              <div class="form-group">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="Password" 
                  class="input-field" 
                  required
                />
              </div>
              <div id="verification-code-container" class="form-group" style="display: none;">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Verification Code" 
                  class="input-field"
                  required
                />
                <p class="help-text">Enter the verification code sent to your trusted device</p>
              </div>
              <button type="submit" class="button-primary" id="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Processing, please wait...</p>
        </div>
        <div id="apps-list" class="apps-container" style="display: none;"></div>
      </div>
    `;
  }

  async handleLogin(e) {
    e.preventDefault();
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const verificationCodeContainer = document.getElementById('verification-code-container');
    const verificationCodeInput = document.getElementById('verification-code');
    
    // Reset error display
    errorDiv.style.display = 'none';
    
    // Show loading indicator
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const appleId = document.getElementById('apple-id').value;
      const password = document.getElementById('password').value;
      const verificationCode = verificationCodeInput.value;

      // Kiểm tra nếu đang chờ 2FA nhưng không nhập code
      if (this.isWaitingFor2FA && !verificationCode) {
        throw new Error('Please enter the verification code');
      }

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appleId,
          password,
          verificationCode: this.isWaitingFor2FA ? verificationCode : undefined
        })
      });

      // Kiểm tra content-type trước khi parse JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Server error: ${text}`);
      }

      const data = await response.json();

      // Handle 2FA requirement
      if (response.status === 401 && data.requires2FA) {
        this.isWaitingFor2FA = true;
        verificationCodeContainer.style.display = 'block';
        verificationCodeInput.focus();
        button.textContent = 'Verify';
        return;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Authentication failed');
      }

      // Success - store session and display apps
      this.isWaitingFor2FA = false;
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      
      // Hide verification code container after successful login
      verificationCodeContainer.style.display = 'none';
    } catch (err) {
      console.error('Login error:', err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = this.isWaitingFor2FA ? 'Verify' : 'Login';
    }
  }

  async handleDownload(bundleId, appName) {
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    errorDiv.style.display = 'none';
    loadingIndicator.style.display = 'flex';

    try {
      // Update status
      loadingIndicator.querySelector('p').textContent = `Downloading ${appName}...`;
      
      const response = await fetch('/.netlify/functions/ipadown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          bundleId,
          sessionInfo: this.sessionInfo 
        })
      });

      // Kiểm tra content-type
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const error = await response.json();
        throw new Error(error.details || 'Download failed');
      } else if (!response.ok) {
        throw new Error(await response.text());
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName}.ipa`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      // Clean up the URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      loadingIndicator.style.display = 'none';
      loadingIndicator.querySelector('p').textContent = 'Processing, please wait...';
    }
  }

  displayApps(apps) {
    const appsContainer = document.getElementById('apps-list');
    
    if (!apps || apps.length === 0) {
      appsContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">No Apps Found</h3>
          </div>
          <div class="card-content">
            <p>No apps were found for this Apple ID.</p>
          </div>
        </div>
      `;
      appsContainer.style.display = 'block';
      return;
    }
    
    appsContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Your Apps</h3>
          <p class="card-description">Select an app to download</p>
        </div>
        <div class="card-content">
          <div class="apps-list">
            ${apps.map(app => `
              <div class="app-item">
                <div class="app-info">
                  <span class="app-name">${app.name}</span>
                  <span class="app-version">Version: ${app.version || 'Unknown'}</span>
                </div>
                <button 
                  class="download-button"
                  onclick="ipaDownloader.handleDownload('${app.bundleId}', '${app.name.replace(/'/g, "\\'")}')"
                >
                  Download
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    appsContainer.style.display = 'block';
  }

  attachEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }
}

// Initialize the downloader
const ipaDownloader = new IpaDownloader();
window.ipaDownloader = ipaDownloader; // Make it globally accessible