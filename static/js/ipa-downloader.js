// static/js/ipa-downloader.js
class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.sessionInfo = null;
    this.isWaitingFor2FA = false;
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
                  required
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
        <div id="status-message" class="status-message" style="display: none;"></div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Processing, please wait...</p>
        </div>
        <div id="apps-list" class="apps-container" style="display: none;"></div>
      </div>
    `;
  }

  showMessage(elementId, message, isError = false) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    element.className = isError ? 'error-message' : 'status-message';
    
    if (!isError) {
      setTimeout(() => {
        element.style.display = 'none';
      }, 5000);
    }
  }

  hideMessage(elementId) {
    document.getElementById(elementId).style.display = 'none';
  }

  async handleLogin(e) {
    e.preventDefault();
    const button = document.getElementById('login-button');
    const loadingIndicator = document.getElementById('loading-indicator');
    const verificationCodeContainer = document.getElementById('verification-code-container');
    
    // Reset UI
    this.hideMessage('error-message');
    this.hideMessage('status-message');
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const appleId = document.getElementById('apple-id').value.trim();
      const password = document.getElementById('password').value.trim();
      const verificationCode = document.getElementById('verification-code')?.value.trim();

      // Validate input
      if (!appleId || !password) {
        throw new Error('Please enter both Apple ID and password');
      }

      if (this.isWaitingFor2FA && !verificationCode) {
        throw new Error('Please enter the verification code');
      }

      console.log('Attempting authentication...'); // Debug
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

      console.log('Response status:', response.status); // Debug

      // Handle non-JSON responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text); // Debug
        throw new Error('Server returned an unexpected response');
      }

      const data = await response.json();
      console.log('Response data:', data); // Debug

      // Handle 2FA case
      if (response.status === 401 && data.requires2FA) {
        this.isWaitingFor2FA = true;
        verificationCodeContainer.style.display = 'block';
        document.getElementById('verification-code').focus();
        this.showMessage('status-message', 'Verification code has been sent to your trusted device');
        button.textContent = 'Verify';
        return;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.details || data.error || 'Authentication failed');
      }

      // Success case
      this.isWaitingFor2FA = false;
      this.sessionInfo = data.sessionInfo;
      this.showMessage('status-message', 'Login successful! Loading your apps...');
      this.displayApps(data.apps);
      verificationCodeContainer.style.display = 'none';

    } catch (error) {
      console.error('Authentication error:', error); // Debug
      this.showMessage('error-message', error.message, true);
      
      // Special case for network errors
      if (error.message.includes('Failed to fetch')) {
        this.showMessage('error-message', 'Network error. Please check your connection.', true);
      }
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = this.isWaitingFor2FA ? 'Verify' : 'Login';
    }
  }

  async handleDownload(bundleId, appName) {
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Reset UI
    this.hideMessage('error-message');
    loadingIndicator.style.display = 'flex';
    loadingIndicator.querySelector('p').textContent = `Preparing ${appName} for download...`;

    try {
      console.log('Starting download for:', bundleId); // Debug
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

      console.log('Download response status:', response.status); // Debug

      // Handle errors
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Download failed' }));
        throw new Error(error.details || error.error || 'Download failed');
      }

      // Get filename from headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `${appName.replace(/[^a-z0-9]/gi, '_')}.ipa`;

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Create download link
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      this.showMessage('status-message', `${appName} downloaded successfully!`);

    } catch (error) {
      console.error('Download error:', error); // Debug
      this.showMessage('error-message', `Failed to download ${appName}: ${error.message}`, true);
    } finally {
      loadingIndicator.style.display = 'none';
    }
  }

  displayApps(apps) {
    const appsContainer = document.getElementById('apps-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    // Hide loading indicator if shown
    loadingIndicator.style.display = 'none';

    if (!apps || apps.length === 0) {
      appsContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">No Apps Found</h3>
          </div>
          <div class="card-content">
            <p>No purchased apps found for this Apple ID.</p>
          </div>
        </div>
      `;
      appsContainer.style.display = 'block';
      return;
    }
    
    appsContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Your Apps (${apps.length})</h3>
          <p class="card-description">Select an app to download</p>
        </div>
        <div class="card-content">
          <div class="apps-list">
            ${apps.map(app => `
              <div class="app-item">
                <div class="app-info">
                  <span class="app-name">${app.name}</span>
                  <span class="app-version">Version: ${app.version || 'N/A'}</span>
                  <span class="app-bundle">Bundle ID: ${app.bundleId}</span>
                </div>
                <button 
                  class="download-button"
                  data-bundle="${app.bundleId}"
                  data-appname="${app.name.replace(/"/g, '&quot;')}"
                >
                  Download
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    
    // Add event listeners to all download buttons
    appsContainer.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const bundleId = e.currentTarget.getAttribute('data-bundle');
        const appName = e.currentTarget.getAttribute('data-appname');
        this.handleDownload(bundleId, appName);
      });
    });
    
    appsContainer.style.display = 'block';
  }

  attachEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.ipaDownloader = new IpaDownloader();
});