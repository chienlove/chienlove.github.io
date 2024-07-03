addDebug('admin.js started');

// Biến để theo dõi trạng thái khởi tạo CMS
let cmsInitialized = false;

// Hàm khởi tạo admin tùy chỉnh
function initializeCustomAdmin() {
    addDebug('Initializing custom admin');
    const app = document.getElementById('custom-admin');
    app.style.display = 'block';
    
    // Kiểm tra xác thực
    if (!window.netlifyIdentity || !window.netlifyIdentity.currentUser()) {
        addDebug('User not authenticated');
        app.innerHTML = '<h2>Vui lòng đăng nhập để tiếp tục</h2>';
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on('login', () => {
                addDebug('User logged in');
                initializeCustomAdmin();
            });
            window.netlifyIdentity.open();
        } else {
            addDebug('Netlify Identity widget not loaded');
        }
        return;
    }

    addDebug('User authenticated, rendering custom admin interface');
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
    addDebug('Checking CMS initialization...');
    if (window.CMS) {
        addDebug('CMS object found');
        if (!cmsInitialized) {
            addDebug('Registering CMS event listener');
            window.CMS.registerEventListener({
                name: 'init',
                handler: function() {
                    addDebug('CMS initialized');
                    cmsInitialized = true;
                    initializeCustomAdmin();
                },
            });
        } else {
            addDebug('CMS already initialized, calling initializeCustomAdmin directly');
            initializeCustomAdmin();
        }
    } else {
        addDebug('CMS object not found, retrying in 1 second');
        setTimeout(checkAndInitialize, 1000);
    }
}

// Gọi hàm kiểm tra khi trang đã tải xong
document.addEventListener('DOMContentLoaded', () => {
    addDebug('DOM content loaded');
    checkAndInitialize();
});