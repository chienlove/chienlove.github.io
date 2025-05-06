// api.js - Xử lý các request API đến GitHub
async function callGitHubAPI(url, method = 'GET', body = null) {
  const user = window.getCurrentUser();
  if (!user?.token?.access_token) {
    throw new Error('Bạn chưa đăng nhập');
  }

  const headers = {
    'Authorization': `Bearer ${user.token.access_token}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'X-Operator': 'netlify',
    'X-Operator-Id': user.id,
    'X-Netlify-User': user.id
  };

  const config = {
    method: method,
    headers: headers,
    credentials: 'include'
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message || `Lỗi HTTP ${response.status}`);
  }

  return response.json();
}

// Export hàm API
window.callGitHubAPI = callGitHubAPI;