// static/js/ipa-downloader.js

class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
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
    const verificationCode = document.getElementById('verification-code').value;
    
    // Reset error display
    errorDiv.style.display = 'none';
    
    // Show loading indicator
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        body: JSON.stringify({
          appleId: document.getElementById('apple-id').value,
          password: document.getElementById('password').value,
          verificationCode: verificationCode || undefined
        })
      });

      const data = await response.json();

      // Handle 2FA requirement
      if (response.status === 401 && data.requires2FA) {
        verificationCodeContainer.style.display = 'block';
        errorDiv.textContent = 'Please enter the verification code sent to your device';
        errorDiv.style.display = 'block';
        button.textContent = 'Verify';
        return;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.details || 'Authentication failed');
      }

      // Success - store session and display apps
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      
      // Hide verification code container after successful login
      verificationCodeContainer.style.display = 'none';
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = verificationCodeContainer.style.display === 'block' ? 'Verify' : 'Login';
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
        body: JSON.stringify({ 
          bundleId,
          sessionInfo: this.sessionInfo 
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Download failed');
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
    document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
  }
}

// Initialize the downloader
const ipaDownloader = new IpaDownloader();
window.ipaDownloader = ipaDownloader; // Make it globally accessible