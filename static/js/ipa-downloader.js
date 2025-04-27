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
        <form id="login-form" class="login-form">
          <h2>Apple ID Login</h2>
          
          <div class="form-group">
            <label for="apple-id">Apple ID</label>
            <input type="email" id="apple-id" required autocomplete="username">
          </div>
          
          <div class="form-group">
            <label for="password">Password</label>
            <input type="password" id="password" required autocomplete="current-password">
          </div>
          
          <div id="verification-code-container" class="form-group" style="display:none">
            <label for="verification-code">Verification Code</label>
            <input type="text" id="verification-code" autocomplete="one-time-code">
            <p class="help-text">Enter the 6-digit code sent to your trusted device</p>
          </div>
          
          <button type="submit" id="login-button">Login</button>
        </form>
        
        <div id="error-message" class="error-message"></div>
        <div id="loading" class="loading" style="display:none">
          <div class="spinner"></div>
          <span>Processing...</span>
        </div>
        
        <div id="apps-container" style="display:none">
          <h3>Your Apps</h3>
          <div id="apps-list"></div>
        </div>
      </div>
    `;
  }

  async handleLogin(e) {
    e.preventDefault();
    
    const button = document.getElementById('login-button');
    const errorEl = document.getElementById('error-message');
    const loadingEl = document.getElementById('loading');
    const codeContainer = document.getElementById('verification-code-container');
    
    // Reset UI
    errorEl.textContent = '';
    errorEl.style.display = 'none';
    button.disabled = true;
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

      // Handle 2FA case
      if (data.status === '2fa_required' || data.requires2FA) {
        codeContainer.style.display = 'block';
        errorEl.textContent = data.message || 'Verification code required';
        errorEl.style.display = 'block';
        button.textContent = 'Verify';
        document.getElementById('verification-code')?.focus();
        return;
      }

      // Handle errors
      if (!response.ok || data.error) {
        throw new Error(data.details || data.error || 'Login failed');
      }

      // Success
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      codeContainer.style.display = 'none';

    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = 'block';
    } finally {
      button.disabled = false;
      loadingEl.style.display = 'none';
      button.textContent = codeContainer.style.display === 'block' ? 'Verify' : 'Login';
    }
  }

  // ... (phần còn lại giữ nguyên)
}

// Khởi tạo
document.addEventListener('DOMContentLoaded', () => {
  window.ipaDownloader = new IpaDownloader();
});