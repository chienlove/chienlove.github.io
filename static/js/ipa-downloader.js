// static/js/ipa-downloader.js
class IpaDownloader {
  constructor() {
    this.elements = {
      container: document.getElementById('ipa-downloader'),
      appleId: null,
      password: null,
      verificationCode: null,
      loginButton: null,
      errorDisplay: null,
      loadingIndicator: null,
      verificationContainer: null,
      appsList: null
    };

    if (!this.elements.container) {
      console.error('Không tìm thấy container chính');
      this.showFatalError('Không thể khởi tạo ứng dụng');
      return;
    }

    this.sessionInfo = null;
    this.is2FARequired = false;
    this.initialize();
  }

  initialize() {
    try {
      this.renderUI();
      this.cacheElements();
      this.attachEvents();
      console.log('Ứng dụng đã sẵn sàng');
    } catch (error) {
      console.error('Lỗi khởi tạo:', error);
      this.showFatalError(error.message);
    }
  }

  renderUI() {
    this.elements.container.innerHTML = `
      <div class="ipa-downloader-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Đăng nhập Apple ID</h3>
            <p class="card-description">Nhập thông tin tài khoản của bạn</p>
          </div>
          <div class="card-content">
            <form id="login-form">
              <div class="form-group">
                <input type="email" id="apple-id-input" placeholder="Email Apple ID" class="input-primary" required autocomplete="username" />
              </div>
              <div class="form-group">
                <input type="password" id="password-input" placeholder="Mật khẩu" class="input-primary" required autocomplete="current-password" />
              </div>
              <div id="verification-container" style="display: none;">
                <input type="text" id="verification-code-input" placeholder="Mã xác minh 6 số" 
                       class="input-primary" inputmode="numeric" pattern="\\d{6}" maxlength="6" autocomplete="one-time-code" />
                <p class="help-text">Nhập mã được gửi đến thiết bị tin cậy của bạn</p>
              </div>
              <button type="submit" id="submit-button" class="button-primary">
                Đăng nhập
              </button>
            </form>
          </div>
        </div>
        <div id="error-display" class="error-message" style="display: none;"></div>
        <div id="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Đang xử lý...</p>
        </div>
        <div id="apps-list-container" style="display: none;"></div>
      </div>
    `;
  }

  cacheElements() {
    this.elements.appleId = document.getElementById('apple-id-input');
    this.elements.password = document.getElementById('password-input');
    this.elements.verificationCode = document.getElementById('verification-code-input');
    this.elements.loginButton = document.getElementById('submit-button');
    this.elements.errorDisplay = document.getElementById('error-display');
    this.elements.loadingIndicator = document.getElementById('loading-indicator');
    this.elements.verificationContainer = document.getElementById('verification-container');
    this.elements.appsList = document.getElementById('apps-list-container');

    if (!this.allElementsValid()) {
      throw new Error('Thiếu phần tử quan trọng trong DOM');
    }
  }

  allElementsValid() {
    return Object.values(this.elements).every(el => el !== null && el !== undefined);
  }

  attachEvents() {
    document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
  }

  async handleLogin(e) {
    e.preventDefault();
    this.resetUIState();

    try {
      const credentials = this.getCredentials();
      this.validateCredentials(credentials);

      const response = await this.sendAuthRequest(credentials);
      const data = await response.json();

      console.log('Phản hồi từ server:', data);

      if (response.status === 401 && data.requires2FA) {
        this.handle2FARequired(data.message);
        return;
      }

      if (!response.ok) {
        throw new Error(data.message || `Lỗi đăng nhập (${response.status})`);
      }

      this.handleLoginSuccess(data);
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.finalizeLoginUI();
    }
  }

  resetUIState() {
    this.elements.errorDisplay.style.display = 'none';
    this.elements.loginButton.disabled = true;
    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.loginButton.textContent = 'Đang xử lý...';
  }

  getCredentials() {
    return {
      appleId: this.elements.appleId.value.trim(),
      password: this.elements.password.value,
      verificationCode: this.is2FARequired ? this.elements.verificationCode.value.trim() : null
    };
  }

  validateCredentials({ appleId, password, verificationCode }) {
    if (!appleId || !password) {
      throw new Error('Vui lòng nhập đầy đủ thông tin');
    }

    if (this.is2FARequired && (!verificationCode || !/^\d{6}$/.test(verificationCode))) {
      throw new Error('Mã xác minh phải có 6 chữ số');
    }
  }

  async sendAuthRequest(credentials) {
    const payload = {
      appleId: credentials.appleId,
      password: credentials.password
    };

    if (credentials.verificationCode) {
      payload.verificationCode = credentials.verificationCode;
    }

    console.log('Gửi yêu cầu đăng nhập:', { ...payload, password: '***' });

    return await fetch('/.netlify/functions/authenticate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  handle2FARequired(message) {
    this.is2FARequired = true;
    this.elements.verificationContainer.style.display = 'block';
    this.elements.verificationCode.focus();
    this.elements.errorDisplay.textContent = message || 'Vui lòng nhập mã xác minh từ thiết bị tin cậy';
    this.elements.errorDisplay.style.display = 'block';
    this.elements.loginButton.textContent = 'Xác minh';
  }

  handleLoginSuccess(data) {
    this.is2FARequired = false;
    this.sessionInfo = data.sessionInfo;
    this.displayApps(data.apps);
    this.elements.verificationContainer.style.display = 'none';
  }

  handleLoginError(error) {
    console.error('Lỗi đăng nhập:', error);
    this.elements.errorDisplay.textContent = error.message;
    this.elements.errorDisplay.style.display = 'block';
  }

  finalizeLoginUI() {
    this.elements.loginButton.disabled = false;
    this.elements.loadingIndicator.style.display = 'none';
    this.elements.loginButton.textContent = this.is2FARequired ? 'Xác minh' : 'Đăng nhập';
  }

  displayApps(apps) {
    if (!apps || apps.length === 0) {
      this.elements.appsList.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Không tìm thấy ứng dụng</h3>
          </div>
          <div class="card-content">
            <p>Tài khoản này không có ứng dụng nào khả dụng</p>
          </div>
        </div>
      `;
      this.elements.appsList.style.display = 'block';
      return;
    }

    this.elements.appsList.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Ứng dụng của bạn</h3>
        </div>
        <div class="card-content">
          <div class="apps-list">
            ${apps.map(app => `
              <div class="app-item">
                <div class="app-info">
                  <span class="app-name">${app.name}</span>
                  <span class="app-version">Phiên bản: ${app.version || 'N/A'}</span>
                </div>
                <button class="download-button" 
                  data-bundle="${app.bundleId}" 
                  data-name="${app.name.replace(/"/g, '&quot;')}">
                  Tải về
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
    this.elements.appsList.style.display = 'block';

    document.querySelectorAll('.download-button').forEach(button => {
      button.addEventListener('click', () => this.handleDownload(
        button.dataset.bundle,
        button.dataset.name
      ));
    });
  }

  async handleDownload(bundleId, appName) {
    this.resetUIState();

    try {
      if (!bundleId || !this.sessionInfo) {
        throw new Error('Yêu cầu tải về không hợp lệ');
      }

      this.elements.loadingIndicator.querySelector('p').textContent = `Đang tải ${appName}...`;

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
        throw new Error(error.message || 'Tải về thất bại');
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
    } catch (error) {
      this.handleLoginError(error);
    } finally {
      this.elements.loadingIndicator.style.display = 'none';
    }
  }

  showFatalError(message) {
    this.elements.container.innerHTML = `
      <div class="error-message" style="padding: 20px; text-align: center;">
        <h3>Lỗi nghiêm trọng</h3>
        <p>${message || 'Ứng dụng không thể khởi động'}</p>
        <button onclick="window.location.reload()" class="button-primary" style="margin-top: 15px;">
          Tải lại trang
        </button>
      </div>
    `;
  }
}

// Khởi tạo ứng dụng khi DOM sẵn sàng
if (document.readyState !== 'loading') {
  new IpaDownloader();
} else {
  document.addEventListener('DOMContentLoaded', () => new IpaDownloader());
}