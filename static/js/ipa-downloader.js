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
          <div class="card-content space-y-4">
            <form id="login-form">
              <input 
                type="email" 
                id="apple-id" 
                placeholder="Apple ID" 
                class="input-primary" 
                required
                autocomplete="username"
              />
              <input 
                type="password" 
                id="password" 
                placeholder="Password" 
                class="input-primary" 
                required
                autocomplete="current-password"
              />
              <div id="verification-code-container" class="hidden">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Verification Code" 
                  class="input-primary"
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
        <div id="error-message" class="error-message hidden"></div>
        <div id="loading-indicator" class="loading-indicator hidden">
          <div class="spinner"></div>
          <p>Processing, please wait...</p>
        </div>
        <div id="apps-list" class="hidden"></div>
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
    errorDiv.classList.add('hidden');
    button.disabled = true;
    loadingIndicator.classList.remove('hidden');
    button.textContent = 'Processing...';

    try {
      const appleId = document.getElementById('apple-id').value.trim();
      const password = document.getElementById('password').value;
      const verificationCode = verificationCodeInput.value.trim();

      // Basic validation
      if (!appleId || !password) {
        throw new Error('Please enter both Apple ID and password');
      }

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appleId,
          password,
          verificationCode: verificationCode || undefined
        })
      });

      const data = await response.json();
      console.log('Authentication response:', data);

      // Handle 2FA requirement
      if (response.status === 401 && data.requires2FA) {
        verificationCodeContainer.classList.remove('hidden');
        errorDiv.textContent = data.message || 'Please enter the verification code sent to your device';
        errorDiv.classList.remove('hidden');
        button.textContent = 'Verify';
        verificationCodeInput.focus();
        return;
      }

      // Handle other errors
      if (!response.ok) {
        throw new Error(data.message || 'Authentication failed');
      }

      // Success case
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      verificationCodeContainer.classList.add('hidden');

    } catch (err) {
      console.error('Login error:', err);
      errorDiv.textContent = err.message;
      errorDiv.classList.remove('hidden');
    } finally {
      button.disabled = false;
      loadingIndicator.classList.add('hidden');
      
      // Update button text based on 2FA state
      const is2FAVisible = !verificationCodeContainer.classList.contains('hidden');
      button.textContent = is2FAVisible ? 'Verify' : 'Login';
    }
  }

  async handleDownload(bundleId, appName) {
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    errorDiv.classList.add('hidden');
    loadingIndicator.classList.remove('hidden');
    loadingIndicator.querySelector('p').textContent = `Downloading ${appName}...`;

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
        throw new Error(error.message || 'Download failed');
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
      errorDiv.classList.remove('hidden');
    } finally {
      loadingIndicator.classList.add('hidden');
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
      appsContainer.classList.remove('hidden');
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
                <button class="download-button" data-bundle="${app.bundleId}" data-name="${app.name.replace(/"/g, '&quot;')}">
                  Download
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    appsContainer.classList.remove('hidden');
    
    // Attach event listeners to download buttons
    document.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', () => {
        this.handleDownload(
          button.getAttribute('data-bundle'),
          button.getAttribute('data-name')
        );
      });
    });
  }

  attachEventListeners() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  window.ipaDownloader = new IpaDownloader();
});