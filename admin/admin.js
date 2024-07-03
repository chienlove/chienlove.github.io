console.log("admin.js loaded");

// Biến để theo dõi trạng thái khởi tạo CMS
let cmsInitialized = false;

// Hàm khởi tạo admin tùy chỉnh
function initializeCustomAdmin() {
    console.log("Initializing custom admin");
    const app = document.getElementById('custom-admin');
    if (!app) {
        console.error("Element with id 'custom-admin' not found");
        return;
    }
    app.style.display = 'block';
    
    // Kiểm tra xác thực
    if (!window.netlifyIdentity || !window.netlifyIdentity.currentUser()) {
        console.log("User not authenticated");
        app.innerHTML = '<h2>Vui lòng đăng nhập để tiếp tục</h2>';
        if (window.netlifyIdentity) {
            window.netlifyIdentity.on('login', () => {
                console.log("User logged in");
                initializeCustomAdmin();
            });
            window.netlifyIdentity.open();
        } else {
            console.error("Netlify Identity widget not loaded");
        }
        return;
    }

    console.log("User authenticated, rendering custom admin interface");
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
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded");
    checkAndInitialize();
});
