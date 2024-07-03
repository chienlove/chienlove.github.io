window.CMS.registerPreviewTemplate('posts', () => null);

// Đảm bảo DOM đã sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM loaded");

    // Khởi tạo CMS
    window.CMS.init();

    // Đợi CMS khởi tạo xong
    window.CMS.registerEventListener({
        name: 'preSave',
        handler: function() {
            console.log("CMS initialized");
            initializeCustomAdmin();
        },
    });
});

function initializeCustomAdmin() {
    const app = document.getElementById('app');
    
    // Kiểm tra xác thực
    if (!window.netlifyIdentity.currentUser()) {
        app.innerHTML = '<h2>Vui lòng đăng nhập để tiếp tục</h2>';
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
            const backend = window.CMS.getBackend();
            const user = await backend.currentUser();
            if (!user) throw new Error('Không thể xác thực người dùng');

            const collection = await backend.getCollection('posts');
            const entry = await backend.createEntry(collection, {
                slug: title.toLowerCase().replace(/\s+/g, '-'),
                data: { 
                    title, 
                    body,
                    date: new Date().toISOString()
                }
            });

            await backend.persistEntry(entry);
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
        const backend = window.CMS.getBackend();
        const collection = await backend.getCollection('posts');
        const entries = await backend.entries(collection);
        
        entries.forEach(entry => {
            const li = document.createElement('li');
            li.textContent = entry.data.title;
            postList.appendChild(li);
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách bài viết:', error);
        content.innerHTML += '<p>Có lỗi xảy ra khi tải danh sách bài viết.</p>';
    }
}