// static/js/ipa-downloader.js

class IpaDownloader {
  constructor() {
    this.container = document.getElementById('ipa-downloader');
    this.requires2FA = false; // Thêm cờ để theo dõi trạng thái 2FA
    this.render();
    this.attachEventListeners();
    
    // Debug: Thêm theo dõi khởi tạo
    console.log('IpaDownloader initialized');
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
        
        <!-- Thêm vùng debug -->
        <div id="debug-panel" class="debug-panel" style="margin-top: 20px; padding: 10px; border: 1px solid #ccc; display: none;">
          <h4>Debug Info</h4>
          <pre id="debug-content" style="white-space: pre-wrap; overflow: auto; max-height: 300px;"></pre>
        </div>
      </div>
    `;
    
    // Debug panel toggle
    if (window.location.search.includes('debug=true')) {
      document.getElementById('debug-panel').style.display = 'block';
    }
  }
  
  // Hàm gỡ lỗi
  debug(info, data) {
    const debugPanel = document.getElementById('debug-content');
    if (debugPanel) {
      const timestamp = new Date().toLocaleTimeString();
      let message = `[${timestamp}] ${info}\n`;
      
      if (data) {
        if (typeof data === 'object') {
          message += JSON.stringify(data, null, 2) + '\n';
        } else {
          message += data + '\n';
        }
      }
      
      debugPanel.textContent += message;
      debugPanel.scrollTop = debugPanel.scrollHeight;
    }
    
    // Luôn ghi log ra console
    console.log(info, data);
  }

  async handleLogin(e) {
    e.preventDefault();
    this.debug('Xử lý đăng nhập...');
    
    // Lấy tham chiếu đến các phần tử DOM
    const button = document.getElementById('login-button');
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const verificationCodeContainer = document.getElementById('verification-code-container');
    const verificationCodeField = document.getElementById('verification-code');
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
      
      const appleId = document.getElementById('apple-id').value;
      const password = document.getElementById('password').value;
      const verificationCode = verificationCodeField.value;
      
      this.debug('Thông tin đăng nhập:', { 
        appleId, 
        hasPassword: !!password, 
        hasVerificationCode: !!verificationCode,
        is2FAVisible: verificationCodeContainer.style.display !== 'none'
      });

      const reqData = {
        appleId,
        password,
        verificationCode: verificationCode || undefined
      };
      
      this.debug('Gửi yêu cầu xác thực...');
      
      const response = await fetch('/.netlify/functions/authenticate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reqData)
      });

      this.debug('Nhận phản hồi', { status: response.status, statusText: response.statusText });
      
      // Lấy dữ liệu phản hồi dưới dạng text trước
      const responseText = await response.text();
      let data;
      
      try {
        data = JSON.parse(responseText);
        this.debug('Phân tích phản hồi thành công', data);
      } catch (jsonError) {
        this.debug('Lỗi phân tích JSON phản hồi', responseText);
        throw new Error('Không thể xử lý phản hồi từ máy chủ: ' + jsonError.message);
      }

      // QUAN TRỌNG: Xử lý yêu cầu 2FA - Kiểm tra nhiều trường
      const is2FARequired = 
        (response.status === 401 && data.requires2FA) || 
        (data.error && data.error.toLowerCase().includes('hai yếu tố')) ||
        (data.error && data.error.toLowerCase().includes('2fa')) ||
        (data.details && data.details.toLowerCase().includes('hai yếu tố')) ||
        (data.details && data.details.toLowerCase().includes('2fa'));
      
      if (is2FARequired) {
        this.debug('*** ĐÃ PHÁT HIỆN YÊU CẦU XÁC THỰC 2FA ***');
        this.requires2FA = true;
        
        // Hiển thị container mã xác thực
        verificationCodeContainer.style.display = 'block';
        
        // Kiểm tra xem container đã hiển thị chưa
        setTimeout(() => {
          if (verificationCodeContainer.offsetParent === null) {
            this.debug('CẢNH BÁO: Container 2FA vẫn bị ẩn sau khi thiết lập style!');
            // Thử một cách khác
            verificationCodeContainer.setAttribute('style', 'display: block !important');
            
            // Kiểm tra lần nữa
            setTimeout(() => {
              if (verificationCodeContainer.offsetParent === null) {
                this.debug('LỖI: Không thể hiển thị container 2FA sau nhiều lần thử!');
              } else {
                this.debug('Container 2FA hiển thị thành công sau lần thử thứ 2');
              }
            }, 100);
          } else {
            this.debug('Container 2FA hiển thị thành công');
          }
        }, 100);
        
        // Hiển thị thông báo lỗi
        errorDiv.textContent = 'Vui lòng nhập mã xác thực được gửi đến thiết bị của bạn';
        errorDiv.style.display = 'block';
        
        // Cập nhật trạng thái
        statusMessage.textContent = 'Cần mã xác thực 2FA';
        button.textContent = 'Xác thực';
        
        // Reset trạng thái loading
        button.disabled = false;
        loadingIndicator.style.display = 'none';
        
        // Focus vào trường mã xác thực
        setTimeout(() => {
          try {
            verificationCodeField.focus();
            this.debug('Đã focus vào trường mã xác thực');
          } catch (focusError) {
            this.debug('Không thể focus vào trường mã xác thực', focusError);
          }
        }, 200);
        
        return;
      }

      // Xử lý các lỗi khác
      if (!response.ok) {
        this.debug('Lỗi phản hồi không phải 2FA', data);
        throw new Error(data.details || data.error || 'Xác thực thất bại');
      }

      // Thành công - lưu phiên và hiển thị ứng dụng
      this.debug('Xác thực thành công, hiển thị danh sách ứng dụng');
      this.sessionInfo = data.sessionInfo;
      this.displayApps(data.apps);
      statusMessage.textContent = 'Đăng nhập thành công';
      
      // Ẩn container mã xác thực sau khi đăng nhập thành công
      this.requires2FA = false;
      verificationCodeContainer.style.display = 'none';
    } catch (err) {
      this.debug('Lỗi xử lý', err);
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
    this.debug(`Bắt đầu tải xuống ứng dụng: ${appName}`);
    
    const errorDiv = document.getElementById('error-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const statusMessage = document.getElementById('status-message');
    
    errorDiv.style.display = 'none';
    loadingIndicator.style.display = 'flex';
    statusMessage.textContent = `Đang tải ${appName}...`;
    statusMessage.style.display = 'block';

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

      this.debug('Phản hồi tải xuống', { status: response.status });

      if (!response.ok) {
        const responseText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(responseText);
          this.debug('Lỗi tải xuống được phân tích', errorData);
        } catch (jsonError) {
          this.debug('Không thể phân tích lỗi tải xuống', responseText);
          throw new Error('Lỗi tải xuống: ' + responseText);
        }
        
        throw new Error(errorData.details || errorData.error || 'Tải xuống thất bại');
      }

      this.debug('Tải xuống thành công, xử lý blob');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName}.ipa`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      statusMessage.textContent = `Đã tải xuống ${appName} thành công`;
      this.debug('Tải xuống hoàn tất');
      
      // Dọn dẹp URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      this.debug('Lỗi tải xuống', err);
      errorDiv.textContent = err.message;
      errorDiv.style.display = 'block';
      statusMessage.textContent = 'Tải xuống thất bại';
    } finally {
      loadingIndicator.style.display = 'none';
      loadingIndicator.querySelector('p').textContent = 'Đang xử lý, vui lòng đợi...';
    }
  }

  displayApps(apps) {
    this.debug('Hiển thị danh sách ứng dụng', { count: apps ? apps.length : 0 });
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
    this.debug('Đã hiển thị danh sách ứng dụng thành công');
  }

  attachEventListeners() {
    const form = document.getElementById('login-form');
    form.addEventListener('submit', this.handleLogin.bind(this));
    this.debug('Đã gắn trình xử lý sự kiện đăng nhập');
  }
}

// Khởi tạo downloader với debug mode
console.log('Starting IpaDownloader initialization...');
const ipaDownloader = new IpaDownloader();
window.ipaDownloader = ipaDownloader; // Làm cho nó có thể truy cập toàn cục
console.log('IpaDownloader initialized and attached to window');