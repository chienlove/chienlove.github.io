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
              />
              <input 
                type="password" 
                id="password" 
                placeholder="Password" 
                class="input-primary" 
                required
              />
              <div id="verification-code-container">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Verification Code" 
                  class="input-primary"
                />
                <p class="help-text">Enter the verification code sent to your trusted device</p>
              </div>
              <button type="submit" class="button-primary" id="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
        <div id="error-message" class="error-message"></div>
        <div id="loading-indicator">
          <div class="spinner"></div>
          <p>Processing, please wait...</p>
        </div>
        <div id="apps-list" class="apps-container"></div>
      </div>
    `;
  }

  async handleLogin(e) {
    e.preventDefault();
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const verificationCodeContainer = document.getElementById('verification-code-container');
    
    // Reset UI
    errorDiv.style.display = 'none';
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appleId: document.getElementById('apple-id').value,
          password: document.getElementById('password').value,
          verificationCode: document.getElementById('verification-code').value || undefined
        })
      });

      const data = await response.json();
      console.log('Authentication response:', data);

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
        throw new Error(data.message || 'Authentication failed');
      }

      // Success case
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
      button.textContent = verificationCodeContainer.style.display === 'block' ? 'Verify' : 'Login';
    }
  }

  async handleDownload(bundleId, appName) {
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    
    errorDiv.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    loadingIndicator.querySelector('p').textContent = `Downloading ${appName}...`;

    try {
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
      window.setTimeout(() => {
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
    appsContainer.style.display = 'block';
    
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

// Initialize the downloader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.ipaDownloader = new IpaDownloader();
});