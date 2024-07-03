document.addEventListener('DOMContentLoaded', () => {
    const loginArea = document.getElementById('login-area');
    const contentArea = document.getElementById('content-area');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const postForm = document.getElementById('post-form');
    const postsList = document.getElementById('posts');

    function showLoginButton() {
        loginArea.style.display = 'block';
        contentArea.style.display = 'none';
    }

    function showAdminContent() {
        loginArea.style.display = 'none';
        contentArea.style.display = 'block';
        loadPosts();
    }

    if (window.netlifyIdentity) {
        netlifyIdentity.on('init', user => {
            if (user) {
                showAdminContent();
            } else {
                showLoginButton();
            }
        });

        loginButton.addEventListener('click', () => {
            netlifyIdentity.open();
        });

        logoutButton.addEventListener('click', () => {
            netlifyIdentity.logout();
        });

        netlifyIdentity.on('login', () => {
            showAdminContent();
        });

        netlifyIdentity.on('logout', () => {
            showLoginButton();
        });
    }

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        
        try {
            await createPost(title, content);
            alert('Bài viết đã được đăng thành công!');
            postForm.reset();
            loadPosts();
        } catch (error) {
            alert('Lỗi khi đăng bài: ' + error.message);
        }
    });

    async function createPost(title, content) {
        const response = await fetch('/.netlify/functions/create-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) {
            throw new Error('Không thể tạo bài viết');
        }

        return response.json();
    }

    async function loadPosts() {
        try {
            const response = await fetch('/.netlify/functions/get-posts');
            const posts = await response.json();
            
            postsList.innerHTML = '';
            posts.forEach(post => {
                const li = document.createElement('li');
                li.textContent = post.title;
                postsList.appendChild(li);
            });
        } catch (error) {
            console.error('Lỗi khi tải bài viết:', error);
        }
    }
});