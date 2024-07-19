document.addEventListener('DOMContentLoaded', (event) => {
    // Thêm nút quay lại danh sách
    const backButton = document.createElement('button');
    backButton.textContent = 'Quay lại danh sách';
    backButton.onclick = () => {
        window.history.back();
    };
    document.querySelector('.css-v758ki-AppHeader').appendChild(backButton);

    // Tùy chỉnh tiêu đề
    const headerTitle = document.querySelector('.css-v758ki-AppHeaderContent');
    if (headerTitle) {
        headerTitle.textContent = 'Quản lý nội dung';
    }

    // Tùy chỉnh danh sách bài viết
    const enhancePostList = () => {
        const postItems = document.querySelectorAll('.css-1hvrgvd-CollectionTopContainer-card-cardTop .css-hn3jn7-CollectionTopRow');
        postItems.forEach(item => {
            const editButton = item.querySelector('a');
            if (editButton) {
                editButton.style.marginRight = '10px';
                
                const deleteButton = document.createElement('button');
                deleteButton.textContent = 'Xóa';
                deleteButton.onclick = (e) => {
                    e.preventDefault();
                    if (confirm('Bạn có chắc muốn xóa bài viết này?')) {
                        // Thêm logic xóa bài viết ở đây
                        console.log('Xóa bài viết');
                    }
                };
                item.appendChild(deleteButton);
            }
        });
    };

    // Gọi hàm tùy chỉnh danh sách bài viết
    enhancePostList();

    // Theo dõi thay đổi DOM để áp dụng tùy chỉnh cho các phần tử mới
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                enhancePostList();
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});