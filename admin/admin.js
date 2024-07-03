// Khởi tạo CMS
const CMS = window.CMS;
CMS.init();

// Tạo giao diện tùy chỉnh
const app = document.getElementById('app');

// Ví dụ về giao diện đơn giản
function renderApp() {
    app.innerHTML = `
        <header>
            <h1>Quản trị nội dung tùy chỉnh</h1>
        </header>
        <nav>
            <button id="createPost">Tạo bài viết mới</button>
            <button id="listPosts">Danh sách bài viết</button>
        </nav>
        <main id="content"></main>
    `;

    document.getElementById('createPost').addEventListener('click', createPost);
    document.getElementById('listPosts').addEventListener('click', listPosts);
}

// Hàm tạo bài viết mới
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
            await CMS.getBackend().currentUser();
            const entry = await CMS.getBackend().createEntry('posts', {
                data: { title, body },
                slug: title.toLowerCase().replace(/\s+/g, '-')
            });
            alert('Bài viết đã được tạo!');
        } catch (error) {
            console.error('Lỗi khi tạo bài viết:', error);
            alert('Có lỗi xảy ra khi tạo bài viết.');
        }
    });
}

// Hàm liệt kê bài viết
async function listPosts() {
    const content = document.getElementById('content');
    content.innerHTML = '<h2>Danh sách bài viết</h2><ul id="postList"></ul>';
    const postList = document.getElementById('postList');

    try {
        const entries = await CMS.getBackend().entries({ collection: 'posts' });
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

// Render ứng dụng
renderApp();