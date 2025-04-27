// static/js/ipa-downloader.js

class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.sessionInfo = null;
    this.render();
    this.attachEventListeners();
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
                  autocomplete="username"
                />
              </div>
              <div class="form-group">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="Password" 
                  class="input-field" 
                  required
                  autocomplete="current-password"
                />
              </div>
              <div id="verification-code-container" class="form-group" style="display: none;">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Verification Code" 
                  class="input-field"
                  autocomplete="one-time-code"
                />
                <p class="help-text">Enter the 6-digit verification code sent to your trusted device</p>
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
    const verificationCode = verificationCodeInput ? verificationCodeInput.value : '';
    
    // Reset error display
    errorDiv.style.display = 'none';
    
    // Show loading indicator
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const appleId = document.getElementById('apple-id').value.trim();
      const password = document.getElementById('password').value;

      if (!appleId || !password) {
        throw new Error('Apple ID and password are required');
      }

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appleId,
          password,
          verificationCode: verificationCode || undefined
        })
      });

      const data = await response.json();

      // Kiểm tra requires2FA bất kể status code nào
      if (data.requires2FA) {
        verificationCodeContainer.style.display = 'block';
        errorDiv.textContent = data.message || 'Please enter the 6-digit verification code sent to your trusted device';
        errorDiv.style.display = 'block';
        button.textContent = 'Verify';
        
        // Focus vào trường nhập mã xác thực
        if (verificationCodeInput) {
          verificationCodeInput.focus();
        }
        return;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Authentication failed');
      }

      // Success - store session and display apps
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      
      // Hide verification code container after successful login
      verificationCodeContainer.style.display = 'none';
      
      // Reset verification code input
      if (verificationCodeInput) {
        verificationCodeInput.value = '';
      }
    } catch (err) {
      console.error('Login error:', err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      
      // Hiển thị trường 2FA nếu có thông báo liên quan
      if (err.message.toLowerCase().includes('2fa') || 
          err.message.toLowerCase().includes('verification') ||
          err.message.toLowerCase().includes('code')) {
        verificationCodeContainer.style.display = 'block';
        button.textContent = 'Verify';
        
        // Focus vào trường nhập mã xác thực
        if (verificationCodeInput) {
          verificationCodeInput.focus();
        }
      }
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      
      if (document.getElementById('verification-code-container').style.display === 'block') {
        button.textContent = 'Verify';
      } else {
        button.textContent = 'Login';
      }
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
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          bundleId,
          sessionInfo: this.sessionInfo 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.replace(/[^a-z0-9]/gi, '_')}.ipa`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);
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
                  <span class="app-name">${this.escapeHtml(app.name)}</span>
                  <span class="app-version">Version: ${this.escapeHtml(app.version || 'Unknown')}</span>
                </div>
                <button 
                  class="download-button"
                  data-bundle-id="${this.escapeAttr(app.bundleId)}"
                  data-app-name="${this.escapeAttr(app.name)}"
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
    
    // Thêm event listener cho các nút download
    document.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const bundleId = e.currentTarget.getAttribute('data-bundle-id');
        const appName = e.currentTarget.getAttribute('data-app-name');
        this.handleDownload(bundleId, appName);
      });
    });
  }

  // Helper function to escape HTML
  escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Helper function to escape HTML attributes
  escapeAttr(unsafe) {
    if (!unsafe) return '';
    return this.escapeHtml(unsafe).replace(/\//g, "&#x2F;");
  }

  attachEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }
}

// Initialize the downloader
document.addEventListener('DOMContentLoaded', () => {
  const ipaDownloader = new IpaDownloader();
  window.ipaDownloader = ipaDownloader; // Make it globally accessible
});