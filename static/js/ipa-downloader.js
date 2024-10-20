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
            <h3 class="card-title">IPA Downloader</h3>
            <p class="card-description">Download IPA files using your Apple ID</p>
          </div>
          <div class="card-content">
            <form id="login-form" class="space-y-4">
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
              <button type="submit" class="button-primary" id="login-button">
                Login
              </button>
            </form>
          </div>
        </div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="apps-list" class="apps-container" style="display: none;"></div>
      </div>
    `;
  }

  async handleLogin(e) {
    e.preventDefault();
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('error-message');
    
    button.disabled = true;
    button.textContent = 'Processing...';
    errorDiv.style.display = 'none';

    try {
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        body: JSON.stringify({
          appleId: document.getElementById('apple-id').value,
          password: document.getElementById('password').value
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Authentication failed');
      }

      const data = await response.json();
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      button.disabled = false;
      button.textContent = 'Login';
    }
  }

  async handleDownload(bundleId) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.style.display = 'none';

    try {
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
      a.download = `${bundleId}.ipa`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    }
  }

  displayApps(apps) {
    const appsContainer = document.getElementById('apps-list');
    appsContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Your Apps</h3>
        </div>
        <div class="card-content">
          <div class="apps-list">
            ${apps.map(app => `
              <div class="app-item">
                <span>${app.name}</span>
                <button 
                  class="button-primary"
                  onclick="ipaDownloader.handleDownload('${app.bundleId}')"
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