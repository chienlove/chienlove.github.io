// static/js/ipa-downloader.js
class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.sessionInfo = null;
    this.is2FARequired = false;
    this.initialize();
  }

  initialize() {
    this.render();
    this.attachEventListeners();
    console.log('IPA Downloader initialized');
  }

  render() {
    this.container.innerHTML = `
      <div class="ipa-downloader-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Apple ID Login</h3>
            <p class="card-description">Enter your credentials to download IPA files</p>
          </div>
          <div class="card-content">
            <form id="login-form">
              <div class="form-group">
                <input 
                  type="email" 
                  id="apple-id" 
                  placeholder="Apple ID" 
                  class="input-primary" 
                  required
                  autocomplete="username"
                />
              </div>
              <div class="form-group">
                <input 
                  type="password" 
                  id="password" 
                  placeholder="Password" 
                  class="input-primary" 
                  required
                  autocomplete="current-password"
                />
              </div>
              <div id="verification-code-container" style="display: none;">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Enter 6-digit code" 
                  class="input-primary verification-input"
                  inputmode="numeric"
                  pattern="[0-9]{6}"
                  maxlength="6"
                  autocomplete="one-time-code"
                />
                <p class="help-text">Check your trusted devices for the verification code</p>
              </div>
              <button type="submit" class="button-primary" id="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Processing, please wait...</p>
        </div>
        <div id="apps-list" style="display: none;"></div>
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

    // Reset UI
    errorDiv.style.display = 'none';
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const appleId = document.getElementById('apple-id').value.trim();
      const password = document.getElementById('password').value;
      const verificationCode = verificationCodeInput.value.trim();

      if (!appleId || !password) {
        throw new Error('Please enter both Apple ID and password');
      }

      const payload = {
        appleId,
        password
      };

      if (this.is2FARequired) {
        if (!verificationCode || !/^\d{6}$/.test(verificationCode)) {
          throw new Error('Please enter a valid 6-digit verification code');
        }
        payload.verificationCode = verificationCode;
      }

      console.log('Sending payload:', { ...payload, password: '***' }); // Mask password in logs

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log('Server response:', data);

      // Handle 2FA requirement
      if (response.status === 401 && data.requires2FA) {
        this.is2FARequired = true;
        verificationCodeContainer.style.display = 'block';
        verificationCodeInput.focus();
        errorDiv.textContent = data.message || 'Please enter the 6-digit verification code from your trusted device';
        errorDiv.style.display = 'block';
        button.textContent = 'Verify Code';
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Authentication failed (Status: ${response.status})`);
      }

      // Login successful
      this.is2FARequired = false;
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      verificationCodeContainer.style.display = 'none';

    } catch (err) {
      console.error('Login error:', err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = this.is2FARequired ? 'Verify Code' : 'Login';
    }
  }

  async handleDownload(bundleId, appName) {
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    errorDiv.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    loadingIndicator.querySelector('p').textContent = `Preparing ${appName} for download...`;

    try {
      if (!bundleId || !this.sessionInfo) {
        throw new Error('Invalid download request');
      }

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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Download failed (Status: ${response.status})`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.replace(/[^a-z0-9]/gi, '_')}.ipa`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
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
        <div class="card mt-4">
          <div class="card-header">
            <h3 class="card-title">No Apps Found</h3>
          </div>
          <div class="card-content">
            <p>No apps available for download with this account.</p>
          </div>
        </div>
      `;
      appsContainer.style.display = 'block';
      return;
    }
    
    appsContainer.innerHTML = `
      <div class="card mt-4">
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
                  <span class="app-version">Version: ${app.version || 'N/A'}</span>
                </div>
                <button 
                  class="download-button"
                  data-bundle-id="${app.bundleId}"
                  data-app-name="${app.name.replace(/"/g, '&quot;')}"
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
    
    // Attach event listeners to download buttons
    document.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', () => {
        this.handleDownload(
          button.getAttribute('data-bundle-id'),
          button.getAttribute('data-app-name')
        );
      });
    });
  }

  attachEventListeners() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }
  }
}

// Initialize with error handling
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (!document.getElementById('ipa-downloader')) {
      console.error('Container element not found');
      return;
    }
    
    window.ipaDownloader = new IpaDownloader();
    console.log('IPA Downloader initialized successfully');
  } catch (err) {
    console.error('Initialization error:', err);
    const container = document.getElementById('ipa-downloader');
    if (container) {
      container.innerHTML = `
        <div class="error-message">
          Application initialization failed. Please refresh the page or contact support.
          <br><br>
          Error: ${err.message}
        </div>
      `;
    }
  }
});