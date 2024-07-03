// Ngăn Netlify CMS khởi tạo
window.CMS = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeCustomAdmin();
});

function initializeCustomAdmin() {
    const app = document.getElementById('app');
    
    // Kiểm tra xác thực
    if (!window.netlifyIdentity.currentUser()) {
        app.innerHTML = '<h2>Vui lòng đăng nhập để tiếp tục</h2>';
        window.netlifyIdentity.on('login', () => {
            initializeCustomAdmin();
        });
        window.netlifyIdentity.open();
        return;
    }

    // Render giao diện tùy chỉnh
    app.innerHTML = `
        <header>
            <h1>Quản trị nội dung tùy chỉnh</h1>
        </header>
        <nav>
            <button id="createPost">Tạo bài viết mới</button>
            <button id="listPosts">Danh sách bài viết</button>
            <button id="logout">Đăng xuất</button>
        </nav>
        <main id="content"></main>
    `;

    // Thêm event listeners
    document.getElementById('createPost').addEventListener('click', createPost);
    document.getElementById('listPosts').addEventListener('click', listPosts);
    document.getElementById('logout').addEventListener('click', () => {
        window.netlifyIdentity.logout();
        window.location.reload();
    });
}

function createPost() {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Tạo bài viết mới</h2>
        <form id="postForm">
            <label for="title">Tiêu đề:</label>
            <input type="text" id="title" required>
            <label for="body">Nội dung:</label>
            <textarea id="body" required></textarea>
            <button type="submit">Lưu bài viết</button>
        </form>
    `;

    document.getElementById('postForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const body = document.getElementById('body').value;
        
        try {
            const user = window.netlifyIdentity.currentUser();
            if (!user) throw new Error('Không thể xác thực người dùng');

            const response = await fetch('/.netlify/functions/create-post', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token.access_token}`
                },
                body: JSON.stringify({
                    title,
                    body,
                    date: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error('Lỗi khi tạo bài viết');
            }

            alert('Bài viết đã được tạo!');
        } catch (error) {
            console.error('Lỗi khi tạo bài viết:', error);
            alert('Có lỗi xảy ra khi tạo bài viết: ' + error.message);
        }
    });
}

async function listPosts() {
    const content = document.getElementById('content');
    content.innerHTML = '<h2>Danh sách bài viết</h2><ul id="postList"></ul>';
    const postList = document.getElementById('postList');

    try {
        const user = window.netlifyIdentity.currentUser();
        if (!user) throw new Error('Không thể xác thực người dùng');

        const response = await fetch('/.netlify/functions/list-posts', {
            headers: {
                'Authorization': `Bearer ${user.token.access_token}`
            }
        });

        if (!response.ok) {
            throw new Error('Lỗi khi lấy danh sách bài viết');
        }

        const posts = await response.json();
        
        posts.forEach(post => {
            const li = document.createElement('li');
            li.textContent = post.title;
            postList.appendChild(li);
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài viết:', error);
        content.innerHTML += '<p>Có lỗi xảy ra khi tải danh sách bài viết.</p>';
    }
}
