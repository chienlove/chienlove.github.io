// static/js/ipa-downloader.js
class IpaDownloader {
  constructor() {
    try {
      this.container = document.getElementById('ipa-downloader');
      if (!this.container) throw new Error('Container element not found');
      
      this.sessionInfo = null;
      this.isWaitingFor2FA = false;
      this.initialize();
    } catch (error) {
      console.error('Initialization error:', error);
      this.showFatalError('Failed to initialize application. Please refresh the page.');
    }
  }

  initialize() {
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
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="6"
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
          <p class="loading-text">Processing, please wait...</p>
        </div>
        <div id="apps-list" class="apps-container" style="display: none;"></div>
      </div>
    `;
  }

  showFatalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fatal-error';
    errorDiv.style.color = 'red';
    errorDiv.style.padding = '20px';
    errorDiv.style.margin = '10px';
    errorDiv.style.border = '1px solid red';
    errorDiv.style.borderRadius = '4px';
    errorDiv.textContent = message;
    document.body.prepend(errorDiv);
  }

  getElement(id) {
    const element = document.getElementById(id);
    if (!element) throw new Error(`Element #${id} not found`);
    return element;
  }

  showMessage(type, message, persistent = false) {
    try {
      const element = this.getElement(`${type}-message`);
      element.textContent = message;
      element.style.display = 'block';
      
      if (!persistent) {
        setTimeout(() => {
          element.style.display = 'none';
        }, 5000);
      }
    } catch (error) {
      console.error(`Could not show ${type} message:`, error);
    }
  }

  async handleLogin(e) {
    e.preventDefault();
    
    try {
      const button = this.getElement('login-button');
      const loadingIndicator = this.getElement('loading-indicator');
      const loadingText = loadingIndicator.querySelector('.loading-text');
      const verificationCodeContainer = this.getElement('verification-code-container');

      // Reset UI
      this.showMessage('error', '', true);
      button.disabled = true;
      loadingIndicator.style.display = 'flex';
      loadingText.textContent = 'Authenticating...';
      button.textContent = 'Processing...';

      const appleId = this.getElement('apple-id').value.trim();
      const password = this.getElement('password').value.trim();
      const verificationCode = this.isWaitingFor2FA ? this.getElement('verification-code').value.trim() : null;

      // Validate inputs
      if (!appleId || !password) {
        throw new Error('Please enter both Apple ID and password');
      }

      if (this.isWaitingFor2FA && !verificationCode) {
        throw new Error('Please enter the 6-digit verification code');
      }

      // Make API request
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

      // Check for network errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle 2FA case
        if (response.status === 401 && errorData.requires2FA) {
          this.isWaitingFor2FA = true;
          verificationCodeContainer.style.display = 'block';
          this.getElement('verification-code').focus();
          this.showMessage('status', 'Verification code has been sent to your trusted device');
          button.textContent = 'Verify';
          return;
        }
        
        throw new Error(errorData.details || errorData.error || 'Authentication failed');
      }

      // Success case
      const data = await response.json();
      this.isWaitingFor2FA = false;
      this.sessionInfo = data.sessionInfo;
      this.showMessage('status', 'Login successful! Loading your apps...');
      this.displayApps(data.apps);
      verificationCodeContainer.style.display = 'none';

    } catch (error) {
      console.error('Login error:', error);
      this.showMessage('error', error.message, true);
    } finally {
      try {
        const button = this.getElement('login-button');
        button.disabled = false;
        button.textContent = this.isWaitingFor2FA ? 'Verify' : 'Login';
        
        this.getElement('loading-indicator').style.display = 'none';
        this.getElement('loading-indicator').querySelector('.loading-text').textContent = 'Processing, please wait...';
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    }
  }

  async handleDownload(bundleId, appName) {
    try {
      const loadingIndicator = this.getElement('loading-indicator');
      const loadingText = loadingIndicator.querySelector('.loading-text');
      
      // Reset UI
      this.showMessage('error', '', true);
      loadingIndicator.style.display = 'flex';
      loadingText.textContent = `Preparing ${appName} for download...`;

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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.details || error.error || 'Download failed');
      }

      // Create download
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

      this.showMessage('status', `${appName} downloaded successfully!`);

    } catch (error) {
      console.error('Download error:', error);
      this.showMessage('error', `Failed to download: ${error.message}`, true);
    } finally {
      this.getElement('loading-indicator').style.display = 'none';
    }
  }

  displayApps(apps) {
    try {
      const appsContainer = this.getElement('apps-list');
      
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
      
      // Add event listeners
      appsContainer.querySelectorAll('.download-button').forEach(button => {
        button.addEventListener('click', () => {
          this.handleDownload(
            button.getAttribute('data-bundle'),
            button.getAttribute('data-appname')
          );
        });
      });
      
      appsContainer.style.display = 'block';

    } catch (error) {
      console.error('Display apps error:', error);
      this.showMessage('error', 'Failed to load apps list', true);
    }
  }

  attachEventListeners() {
    try {
      this.getElement('login-form').addEventListener('submit', (e) => this.handleLogin(e));
    } catch (error) {
      console.error('Event listener error:', error);
    }
  }
}

// Initialize when DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (!window.ipaDownloader) {
      window.ipaDownloader = new IpaDownloader();
      console.log('IPADownloader initialized successfully');
    }
  } catch (error) {
    console.error('Failed to initialize:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fatal-error';
    errorDiv.textContent = 'Application failed to initialize. Please refresh the page.';
    document.body.prepend(errorDiv);
  }
});