// Biến để theo dõi trạng thái khởi tạo CMS
let cmsInitialized = false;

// Hàm khởi tạo admin tùy chỉnh
function initializeCustomAdmin() {
    const app = document.getElementById('custom-admin');
    app.style.display = 'block';
    
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

// Hàm kiểm tra và khởi tạo
function checkAndInitialize() {
    console.log("Checking CMS initialization...");
    if (window.CMS) {
        console.log("CMS object found");
        if (!cmsInitialized) {
            console.log("Registering CMS event listener");
            window.CMS.registerEventListener({
                name: 'init',
                handler: function() {
                    console.log("CMS initialized");
                    cmsInitialized = true;
                    initializeCustomAdmin();
                },
            });
        } else {
            console.log("CMS already initialized, calling initializeCustomAdmin directly");
            initializeCustomAdmin();
        }
    } else {
        console.log("CMS object not found, retrying in 1 second");
        setTimeout(checkAndInitialize, 1000);
    }
}

// Gọi hàm kiểm tra khi trang đã tải xong
document.addEventListener('DOMContentLoaded', checkAndInitialize);

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
            const collection = window.CMS.getCollection('posts');
            const entry = collection.newEntry({
                data: {
                    title: title,
                    body: body,
                    date: new Date().toISOString()
                }
            });

            await window.CMS.entryPersister.persistEntry(entry);
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
        const collection = window.CMS.getCollection('posts');
        const entries = await collection.entries();
        
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