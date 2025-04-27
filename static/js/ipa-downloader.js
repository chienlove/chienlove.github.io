class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.sessionInfo = null;
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="ipa-container">
        <div class="login-section">
          <h2>Apple ID Login</h2>
          <form id="login-form">
            <div class="form-group">
              <input type="email" id="apple-id" placeholder="Apple ID" required>
            </div>
            <div class="form-group">
              <input type="password" id="password" placeholder="Password" required>
            </div>
            <div id="2fa-group" class="form-group" style="display:none">
              <input type="text" id="verification-code" placeholder="Verification Code">
              <small class="help-text">Check your trusted devices</small>
            </div>
            <button type="submit" id="login-btn">Login</button>
          </form>
          <div id="error-message" class="error-message"></div>
          <div id="loading" class="loading" style="display:none">
            <div class="spinner"></div>
            <span>Processing...</span>
          </div>
        </div>
        <div id="apps-section" style="display:none"></div>
      </div>
    `;
  }

  attachEventListeners() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btn = document.getElementById('login-btn');
      const errorEl = document.getElementById('error-message');
      const loadingEl = document.getElementById('loading');
      const twoFaGroup = document.getElementById('2fa-group');
      
      // Reset UI
      errorEl.textContent = '';
      errorEl.style.display = 'none';
      btn.disabled = true;
      loadingEl.style.display = 'flex';
      
      try {
        const response = await fetch('/.netlify/functions/authenticate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appleId: document.getElementById('apple-id').value.trim(),
            password: document.getElementById('password').value,
            verificationCode: document.getElementById('verification-code')?.value
          })
        });

        const data = await response.json();
        
        // Xử lý 2FA
        if (data.status === '2fa_required' || data.requires2FA) {
          twoFaGroup.style.display = 'block';
          errorEl.textContent = data.message || 'Verification required';
          errorEl.style.display = 'block';
          btn.textContent = 'Verify';
          document.getElementById('verification-code').focus();
          return;
        }
        
        // Xử lý lỗi
        if (!response.ok || data.error) {
          throw new Error(data.details || data.error || 'Login failed');
        }
        
        // Thành công
        this.sessionInfo = data.sessionInfo;
        this.displayApps(data.apps || []);
        
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.style.display = 'block';
        console.error('Login error:', err);
      } finally {
        btn.disabled = false;
        loadingEl.style.display = 'none';
      }
    });
  }

  displayApps(apps) {
    const container = document.getElementById('apps-section');
    container.innerHTML = apps.length > 0 ? `
      <h3>Your Apps</h3>
      <div class="apps-list">
        ${apps.map(app => `
          <div class="app-item">
            <div class="app-info">
              <h4>${app.name}</h4>
              <p>Version: ${app.version || 'N/A'}</p>
            </div>
            <button 
              class="download-btn" 
              data-bundle="${app.bundleId}"
              data-name="${app.name}"
            >
              Download
            </button>
          </div>
        `).join('')}
      </div>
    ` : '<p>No apps found</p>';
    
    container.style.display = 'block';
    
    // Thêm event listeners cho các nút download
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleDownload(
          btn.dataset.bundle,
          btn.dataset.name
        );
      });
    });
  }

  async handleDownload(bundleId, appName) {
    const loading = document.getElementById('loading');
    const errorEl = document.getElementById('error-message');
    
    errorEl.style.display = 'none';
    loading.style.display = 'flex';
    loading.querySelector('span').textContent = `Downloading ${appName}...`;
    
    try {
      const response = await fetch('/.netlify/functions/ipadown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.replace(/[^\w]/g, '_')}.ipa`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      loading.style.display = 'none';
    }
  }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  window.downloader = new IpaDownloader();
});