// ========================
// CẤU HÌNH BAN ĐẦU
// ========================
document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Netlify Identity
  if (window.netlifyIdentity) {
    netlifyIdentity.init();
    console.log("[System] Netlify Identity initialized");

    // Xử lý sự kiện đăng nhập
    netlifyIdentity.on('init', (user) => {
      updateUI(user);
    });

    netlifyIdentity.on('login', (user) => {
      console.log("[Auth] User logged in:", user.email);
      updateUI(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      console.log("[Auth] User logged out");
      updateUI(null);
    });
  }

  // ========================
  // XỬ LÝ GIAO DIỆN
  // ========================
  function updateUI(user) {
    const loginBtn = document.getElementById('login-btn');
    const dashboard = document.getElementById('dashboard');

    if (user) {
      loginBtn.textContent = `Logout (${user.email})`;
      dashboard.style.display = 'flex';
      loadPosts(); // Tải bài viết khi đăng nhập
    } else {
      loginBtn.textContent = 'Login';
      dashboard.style.display = 'none';
    }
  }

  // Nút Login/Logout
  document.getElementById('login-btn').addEventListener('click', () => {
    if (netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
    } else {
      netlifyIdentity.open();
    }
  });

  // ========================
  // QUẢN LÝ BÀI VIẾT
  // ========================
  async function loadPosts() {
    console.log("[Posts] Loading posts...");
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = '<div class="loading">Loading posts...</div>';

    try {
      // Lấy danh sách thư mục trong /content
      const categoriesRes = await fetch('/.netlify/git/github/contents/content', {
        credentials: 'include', // QUAN TRỌNG: Gửi cookie chứa token
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!categoriesRes.ok) throw new Error(await categoriesRes.text());
      
      const categories = await categoriesRes.json();
      console.log("[Posts] Found categories:", categories.map(c => c.name));

      // Lấy bài viết từ tất cả thư mục con
      let allPosts = [];
      for (const category of categories) {
        if (category.type === 'dir') {
          const postsRes = await fetch(`/.netlify/git/github/contents/content/${category.name}`, {
            credentials: 'include',
            headers: { 'Accept': 'application/vnd.github.v3+json' }
          });
          
          if (!postsRes.ok) continue; // Bỏ qua nếu thư mục lỗi
          
          const posts = await postsRes.json();
          allPosts = allPosts.concat(
            posts.filter(p => p.type === 'file').map(post => ({
              name: post.name,
              path: post.path,
              category: category.name
            }))
          );
        }
      }

      renderPosts(allPosts);
    } catch (error) {
      console.error("[Posts] Load error:", error);
      postsList.innerHTML = `
        <div class="error">
          Failed to load posts. <br>
          <strong>Error:</strong> ${error.message}<br>
          <button onclick="location.reload()">Retry</button>
        </div>
      `;
    }
  }

  function renderPosts(posts) {
    console.log("[Posts] Rendering", posts.length, "posts");
    const postsList = document.getElementById('posts-list');
    
    if (posts.length === 0) {
      postsList.innerHTML = '<div class="empty">No posts found in /content/</div>';
      return;
    }

    postsList.innerHTML = posts.map(post => `
      <div class="post-item">
        <span class="post-category">${post.category}/</span>
        <span class="post-title">${post.name.replace('.md', '')}</span>
        <button onclick="editPost('${post.path}')">Edit</button>
      </div>
    `).join('');
  }

  // ========================
  // THÊM BÀI VIẾT MỚI
  // ========================
  document.getElementById('create-post').addEventListener('click', () => {
    console.log("[Editor] Opening new post form");
    document.getElementById('post-form').style.display = 'block';
  });

  document.getElementById('submit-post').addEventListener('click', async () => {
    const category = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();

    if (!title || !content) {
      alert("Please fill both title and content!");
      return;
    }

    console.log("[Editor] Creating post:", { category, title });

    try {
      const response = await fetch(`/.netlify/git/github/contents/content/${category}/${title}.md`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Add new post: ${title}`,
          content: btoa(unescape(encodeURIComponent(content)))
        })
      });

      if (!response.ok) throw new Error(await response.text());

      alert("Post created successfully!");
      document.getElementById('post-form').style.display = 'none';
      loadPosts(); // Refresh danh sách
    } catch (error) {
      console.error("[Editor] Create error:", error);
      alert(`Error: ${error.message || 'Failed to create post'}`);
    }
  });
});

// ========================
// HÀM TOÀN CỤC
// ========================
function editPost(path) {
  console.log("[Editor] Editing post:", path);
  alert(`Edit post: ${path}\n\nFeature coming soon!`);
}