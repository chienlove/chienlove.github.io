document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Netlify Identity
  if (window.netlifyIdentity) {
    netlifyIdentity.init();
    updateUI(netlifyIdentity.currentUser());

    netlifyIdentity.on('login', (user) => {
      updateUI(user);
      netlifyIdentity.close();
    });

    netlifyIdentity.on('logout', () => {
      updateUI(null);
    });
  }

  // Xử lý nút Login/Logout
  document.getElementById('login-btn').addEventListener('click', () => {
    if (netlifyIdentity.currentUser()) {
      netlifyIdentity.logout();
    } else {
      netlifyIdentity.open();
    }
  });

  // Tải danh sách bài viết
  async function loadPosts() {
    try {
      const categoriesResponse = await fetch('/.netlify/git/github/contents/content');
      const categories = await categoriesResponse.json();

      let allPosts = [];
      for (const category of categories) {
        if (category.type === 'dir') {
          const postsResponse = await fetch(`/.netlify/git/github/contents/content/${category.name}`);
          const posts = await postsResponse.json();
          allPosts = allPosts.concat(
            posts.map(post => ({
              ...post,
              category: category.name
            }))
          );
        }
      }

      renderPosts(allPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
      document.getElementById('posts-list').innerHTML = '<p>Error loading posts. Check console.</p>';
    }
  }

  // Hiển thị bài viết
  function renderPosts(posts) {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = posts
      .map(post => `
        <div class="post-item">
          <strong>${post.category}/</strong>${post.name.replace('.md', '')}
          <button onclick="editPost('content/${post.category}/${post.name}')">Edit</button>
        </div>
      `)
      .join('');
  }

  // Xử lý New Post
  document.getElementById('create-post').addEventListener('click', () => {
    document.getElementById('post-form').style.display = 'block';
  });

  document.getElementById('submit-post').addEventListener('click', async () => {
    const category = document.getElementById('post-category').value;
    const title = document.getElementById('post-title').value;
    const content = document.getElementById('post-content').value;

    if (!title || !content) {
      alert('Please fill all fields!');
      return;
    }

    try {
      const response = await fetch(`/.netlify/git/github/contents/content/${category}/${title}.md`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Add new post: ${title}`,
          content: btoa(unescape(encodeURIComponent(content)))
        })
      });

      if (response.ok) {
        alert('Post created!');
        document.getElementById('post-form').style.display = 'none';
        loadPosts();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating post. Check console.');
    }
  });
});

// Hàm toàn cục để sửa bài viết
window.editPost = (path) => {
  alert(`Edit post: ${path}`);
  // Triển khai thêm logic sửa bài tại đây
};

// Cập nhật giao diện
function updateUI(user) {
  const loginBtn = document.getElementById('login-btn');
  const dashboard = document.getElementById('dashboard');

  if (user) {
    loginBtn.textContent = `Logout (${user.email})`;
    dashboard.style.display = 'flex';
    loadPosts();
  } else {
    loginBtn.textContent = 'Login';
    dashboard.style.display = 'none';
  }
}