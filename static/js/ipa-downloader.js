// static/js/ipa-downloader.js

class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.requires2FA = false; // Thêm cờ để theo dõi trạng thái 2FA
    this.render();
    this.attachEventListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="ipa-downloader-container">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Đăng nhập Apple ID</h3>
            <p class="card-description">Nhập Apple ID của bạn để tải file IPA</p>
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
                  placeholder="Mật khẩu" 
                  class="input-field" 
                  required
                />
              </div>
              <div id="verification-code-container" class="form-group" style="display: none;">
                <input 
                  type="text" 
                  id="verification-code" 
                  placeholder="Mã xác thực" 
                  class="input-field"
                />
                <p class="help-text">Nhập mã xác thực được gửi đến thiết bị của bạn</p>
              </div>
              <button type="submit" class="button-primary" id="login-button">
                Đăng nhập
              </button>
            </form>
            <!-- Thêm phần tử hiển thị trạng thái -->
            <div id="status-message" class="status-message" style="display: none;"></div>
          </div>
        </div>
        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="loading-indicator" class="loading-indicator" style="display: none;">
          <div class="spinner"></div>
          <p>Đang xử lý, vui lòng đợi...</p>
        </div>
        <div id="apps-list" class="apps-container" style="display: none;"></div>
      </div>
    `;
  }

  async handleLogin(e) {
    e.preventDefault();
    
    // Lấy tham chiếu đến các phần tử DOM
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const verificationCodeContainer = document.getElementById('verification-code-container');
    const verificationCode = document.getElementById('verification-code').value;
    const statusMessage = document.getElementById('status-message');
    
    // Reset hiển thị lỗi
    errorDiv.style.display = 'none';
    
    // Hiển thị chỉ báo đang tải
    button.disabled = true;
    loadingIndicator.style.display = 'flex';
    button.textContent = 'Đang xử lý...';

    try {
      // Hiển thị trạng thái
      statusMessage.textContent = 'Đang xác thực...';
      statusMessage.style.display = 'block';
      
      console.log("Gửi yêu cầu xác thực với:", {
        appleId: document.getElementById('apple-id').value,
        hasPassword: !!document.getElementById('password').value,
        hasVerificationCode: !!verificationCode
      });

      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          appleId: document.getElementById('apple-id').value,
          password: document.getElementById('password').value,
          verificationCode: verificationCode || undefined
        })
      });

      console.log("Nhận phản hồi với mã trạng thái:", response.status);
      const data = await response.json();
      console.log("Dữ liệu phản hồi:", JSON.stringify(data, null, 2));

      // Xử lý yêu cầu 2FA
      if (response.status === 401 && data.requires2FA) {
        console.log("Đã phát hiện yêu cầu xác thực 2FA");
        this.requires2FA = true;
        verificationCodeContainer.style.display = 'block';
        errorDiv.textContent = 'Vui lòng nhập mã xác thực được gửi đến thiết bị của bạn';
        errorDiv.style.display = 'block';
        button.textContent = 'Xác thực';
        statusMessage.textContent = 'Cần mã xác thực 2FA';
        return;
      }

      // Xử lý các lỗi khác
      if (!response.ok) {
        console.error("Lỗi phản hồi:", data);
        throw new Error(data.details || data.error || 'Xác thực thất bại');
      }

      // Thành công - lưu phiên và hiển thị ứng dụng
      console.log("Xác thực thành công, hiển thị danh sách ứng dụng");
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      statusMessage.textContent = 'Đăng nhập thành công';
      
      // Ẩn container mã xác thực sau khi đăng nhập thành công
      this.requires2FA = false;
      verificationCodeContainer.style.display = 'none';
    } catch (err) {
      console.error("Lỗi xử lý:", err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      statusMessage.textContent = 'Xác thực thất bại';
    } finally {
      button.disabled = false;
      loadingIndicator.style.display = 'none';
      button.textContent = this.requires2FA ? 'Xác thực' : 'Đăng nhập';
    }
  }

  async handleDownload(bundleId, appName) {
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const statusMessage = document.getElementById('status-message');
    
    errorDiv.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    statusMessage.textContent = `Đang tải ${appName}...`;
    statusMessage.style.display = 'block';

    try {
      console.log(`Bắt đầu tải xuống ứng dụng: ${appName} (${bundleId})`);
      
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
        const errorData = await response.json();
        console.error("Lỗi tải xuống:", errorData);
        throw new Error(errorData.details || errorData.error || 'Tải xuống thất bại');
      }

      console.log("Nhận phản hồi tải xuống thành công");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName}.ipa`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      statusMessage.textContent = `Đã tải xuống ${appName} thành công`;
      
      // Dọn dẹp URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi tải xuống:", err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      statusMessage.textContent = 'Tải xuống thất bại';
    } finally {
      loadingIndicator.style.display = 'none';
      loadingIndicator.querySelector('p').textContent = 'Đang xử lý, vui lòng đợi...';
    }
  }

  displayApps(apps) {
    const appsContainer = document.getElementById('apps-list');
    
    if (!apps || apps.length === 0) {
      appsContainer.innerHTML = `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Không tìm thấy ứng dụng</h3>
          </div>
          <div class="card-content">
            <p>Không tìm thấy ứng dụng nào cho Apple ID này.</p>
          </div>
        </div>
      `;
      appsContainer.style.display = 'block';
      return;
    }
    
    appsContainer.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Ứng dụng của bạn</h3>
          <p class="card-description">Chọn ứng dụng để tải xuống</p>
        </div>
        <div class="card-content">
          <div class="apps-list">
            ${apps.map(app => `
              <div class="app-item">
                <div class="app-info">
                  <span class="app-name">${app.name}</span>
                  <span class="app-version">Phiên bản: ${app.version || 'Không xác định'}</span>
                </div>
                <button 
                  class="download-button"
                  onclick="ipaDownloader.handleDownload('${app.bundleId}', '${app.name.replace(/'/g, "\\'")}')"
                >
                  Tải xuống
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

// Khởi tạo downloader
const ipaDownloader = new IpaDownloader();
window.ipaDownloader = ipaDownloader; // Làm cho nó có thể truy cập toàn cục