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
        <div class="login-box">
          <h2>Apple ID Login</h2>
          <form id="login-form">
            <div class="input-group">
              <label for="apple-id">Apple ID</label>
              <input 
                type="email" 
                id="apple-id" 
                required
                placeholder="your@appleid.com"
              >
            </div>
            
            <div class="input-group">
              <label for="password">Password</label>
              <input 
                type="password" 
                id="password" 
                required
                placeholder="Your password"
              >
            </div>
            
            <div id="2fa-container" class="input-group" style="display:none">
              <label for="verification-code">Verification Code</label>
              <input 
                type="text" 
                id="verification-code"
                placeholder="6-digit code"
              >
              <small>Check your trusted devices</small>
            </div>
            
            <button type="submit" id="login-btn">Login</button>
          </form>
          
          <div id="error-box" class="error-box" style="display:none"></div>
          <div id="loading" class="loading" style="display:none">
            <div class="spinner"></div>
            <span>Processing...</span>
          </div>
        </div>
        
        <div id="apps-section" style="display:none">
          <h3>Your Apps</h3>
          <div id="apps-list"></div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); // Quan trọng: ngăn reload trang
      
      const btn = document.getElementById('login-btn');
      const errorBox = document.getElementById('error-box');
      const loading = document.getElementById('loading');
      const twoFaContainer = document.getElementById('2fa-container');
      
      // Reset UI
      errorBox.style.display = 'none';
      btn.disabled = true;
      loading.style.display = 'flex';
      
      try {
        const response = await fetch('/.netlify/functions/authenticate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            appleId: document.getElementById('apple-id').value.trim(),
            password: document.getElementById('password').value,
            verificationCode: document.getElementById('verification-code')?.value
          })
        });

        const data = await response.json();
        
        // Xử lý 2FA
        if (data.status === '2fa_required' || data.requires2FA) {
          twoFaContainer.style.display = 'block';
          errorBox.textContent = data.message || 'Please enter the verification code';
          errorBox.style.display = 'block';
          btn.textContent = 'Verify';
          document.getElementById('verification-code')?.focus();
          return;
        }
        
        // Xử lý lỗi
        if (!response.ok || data.error) {
          throw new Error(data.details || data.error || 'Login failed');
        }
        
        // Thành công
        this.sessionInfo = data.sessionInfo;
        this.displayApps(data.apps);
        twoFaContainer.style.display = 'none';
        
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.style.display = 'block';
        console.error('Login error:', err);
      } finally {
        btn.disabled = false;
        loading.style.display = 'none';
        btn.textContent = twoFaContainer.style.display === 'block' ? 'Verify' : 'Login';
      }
    });
  }

  displayApps(apps) {
    const container = document.getElementById('apps-section');
    const list = document.getElementById('apps-list');
    
    if (!apps || apps.length === 0) {
      list.innerHTML = '<p>No apps found</p>';
      container.style.display = 'block';
      return;
    }
    
    list.innerHTML = apps.map(app => `
      <div class="app-item">
        <div class="app-info">
          <h4>${this.escapeHtml(app.name)}</h4>
          <p>Version: ${this.escapeHtml(app.version || 'N/A')}</p>
        </div>
        <button 
          class="download-btn" 
          data-bundle="${this.escapeAttr(app.bundleId)}"
          data-name="${this.escapeAttr(app.name)}"
        >
          Download
        </button>
      </div>
    `).join('');
    
    // Thêm event listener cho các nút download
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleDownload(
          btn.dataset.bundle,
          btn.dataset.name
        );
      });
    });
    
    container.style.display = 'block';
  }

  async handleDownload(bundleId, appName) {
    const loading = document.getElementById('loading');
    const errorBox = document.getElementById('error-box');
    
    errorBox.style.display = 'none';
    loading.style.display = 'flex';
    loading.querySelector('span').textContent = `Downloading ${appName}...`;
    
    try {
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
        throw new Error(error.details || 'Download failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.replace(/[^\w]/g, '_')}.ipa`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
    } catch (err) {
      errorBox.textContent = err.message;
      errorBox.style.display = 'block';
    } finally {
      loading.style.display = 'none';
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  escapeAttr(text) {
    return this.escapeHtml(text).replace(/"/g, '&quot;');
  }
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  window.ipaDownloader = new IpaDownloader();
});