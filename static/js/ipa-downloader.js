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
          <div class="card-content">
            <form id="login-form" class="login-form">
              <div class="form-group">
                <input type="email" id="apple-id" placeholder="Apple ID" class="input-field" required />
              </div>
              <div class="form-group">
                <input type="password" id="password" placeholder="Password" class="input-field" required />
              </div>
              <div id="verification-code-container" class="form-group" style="display: none;">
                <input type="text" id="verification-code" placeholder="Verification Code" class="input-field" />
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

    errorDiv.style.display = 'none';
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Processing...';

    try {
      const bodyData = {
        appleId: document.getElementById('apple-id').value,
        password: document.getElementById('password').value,
      };

      if (verificationCode) {
        bodyData.verificationCode = verificationCode;
        bodyData.sessionInfo = this.sessionInfo;
      }

      console.log('Sending login request:', bodyData);

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();

      console.log('Received response from authenticate:', data);

      if (response.status === 401 && data.requires2FA) {
        this.sessionInfo = data.sessionInfo;
        verificationCodeContainer.style.display = 'block';
        errorDiv.textContent = 'Please enter the verification code sent to your device';
        errorDiv.style.display = 'block';
        button.textContent = 'Verify';
        button.disabled = false;
        loadingIndicator.style.display = 'none';
        return;
      }

      if (!response.ok) {
        throw new Error(data.details || 'Authentication failed');
      }

      this.sessionInfo = data.sessionInfo;
      console.log('Login success, sessionInfo:', this.sessionInfo);
      await this.fetchApps();
    } catch (err) {
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = verificationCodeContainer.style.display === 'block' ? 'Verify' : 'Login';
    }
  }

  async fetchApps() {
    console.log('Fetching apps list...');
    // bạn có thể thêm tương tự debug nếu muốn
  }

  attachEventListeners() {
    document.getElementById('login-form').addEventListener('submit', this.handleLogin.bind(this));
  }
}

const ipaDownloader = new IpaDownloader();
window.ipaDownloader = ipaDownloader;