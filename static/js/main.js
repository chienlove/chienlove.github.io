document.addEventListener('DOMContentLoaded', function () {
    // Tích hợp script kiểm tra trạng thái
    const statusText = document.getElementById('status-text');
    const statusIcon = document.getElementById('status-icon');

    async function checkStatus() {
        try {
            const response = await fetch('/api/check-status');
            const data = await response.json();

            switch(data.status) {
                case 'signed':
                    statusText.textContent = 'Đã ký';
                    statusText.classList.add('text-success');
                    statusText.classList.remove('text-danger');
                    statusIcon.classList.add('bg-success');
                    statusIcon.classList.remove('bg-danger');
                    break;
                case 'revoked':
                    statusText.textContent = 'Đã thu hồi';
                    statusText.classList.add('text-danger');
                    statusText.classList.remove('text-success');
                    statusIcon.classList.add('bg-danger');
                    statusIcon.classList.remove('bg-success');
                    break;
                default:
                    statusText.textContent = 'Không xác định';
                    statusText.classList.remove('text-success', 'text-danger');
                    statusIcon.classList.remove('bg-success', 'bg-danger');
            }
        } catch (error) {
            statusText.textContent = 'Lỗi kết nối';
            console.error('Lỗi kiểm tra trạng thái:', error);
        }
    }

    // Kiểm tra ngay lập tức khi trang tải
    checkStatus();

    // Cập nhật trạng thái mỗi 5 phút
    setInterval(checkStatus, 5 * 60 * 1000);

    // Menu handling
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    if (hamburgerMenu && mobileNav && sidebarOverlay) {
        hamburgerMenu.addEventListener('click', function () {
            mobileNav.classList.toggle('active');
            sidebarOverlay.classList.toggle('active');
        });

        sidebarOverlay.addEventListener('click', function () {
            mobileNav.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
    }

    // Blockquote handling
    const processBlockquotes = () => {
        document.querySelectorAll('blockquote').forEach(quote => {
            const content = quote.innerHTML.trim();
            const firstLine = content.split('\n')[0];
            
            // Kiểm tra có type đặc biệt không
            if (firstLine.includes('[!')) {
                try {
                    const typeMatch = firstLine.match(/\[!(.*?)\]/);
                    if (typeMatch && typeMatch[1]) {
                        const type = typeMatch[1].toLowerCase();
                        // Thêm class dựa trên type
                        quote.classList.add(type);
                        // Xóa [!type] khỏi nội dung
                        quote.innerHTML = content.replace(/\[!.*?\]/, '').trim();
                    }
                } catch (error) {
                    console.warn('Error processing blockquote:', error);
                }
            }

            // Xử lý citation nếu có
            const lines = quote.innerHTML.split('\n');
            if (lines.length > 1) {
                const lastLine = lines[lines.length - 1].trim();
                if (lastLine.startsWith('--') || lastLine.startsWith('—')) {
                    // Tạo thẻ cite cho phần trích dẫn tác giả
                    const citation = document.createElement('cite');
                    citation.textContent = lastLine.replace(/^-+\s*/, '').trim();
                    quote.innerHTML = lines.slice(0, -1).join('\n');
                    quote.appendChild(citation);
                }
            }
        });
    };

    // Xử lý blockquotes khi trang tải xong
    processBlockquotes();

    // Optional: Xử lý blockquotes khi nội dung được cập nhật động
    const contentObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && 
                mutation.addedNodes.length > 0) {
                processBlockquotes();
            }
        });
    });

    // Theo dõi thay đổi trong content area
    const contentArea = document.querySelector('.content-area'); // Thay đổi selector này theo cấu trúc của bạn
    if (contentArea) {
        contentObserver.observe(contentArea, {
            childList: true,
            subtree: true
        });
    }

    // Tự cập nhật thời gian đăng bài
    const postTimeElements = document.querySelectorAll('.post-time');
    postTimeElements.forEach(el => {
        // Lấy thời gian từ `data-time` và chuyển đổi sang UTC
        const postTime = new Date(el.getAttribute('data-time'));
        const now = new Date(); // Thời gian hiện tại của trình duyệt người dùng

        // Tính toán khoảng thời gian dựa trên UTC
        const diffMs = now.getTime() - postTime.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        let timeAgoText = '';
        if (diffMinutes < 1) {
            timeAgoText = 'Vừa xong';
        } else if (diffMinutes < 60) {
            timeAgoText = `${diffMinutes} phút trước`;
        } else if (diffHours < 24) {
            timeAgoText = `${diffHours} giờ trước`;
        } else if (diffDays === 1) {
            // Nếu là ngày hôm qua
            timeAgoText = `Hôm qua ${postTime.getUTCHours()}:${postTime.getUTCMinutes().toString().padStart(2, '0')}`;
        } else if (diffDays < 7) {
            // Hiển thị thứ nếu trong vòng 7 ngày
            const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeek = daysOfWeek[postTime.getUTCDay()];
            timeAgoText = `${dayOfWeek}, ${postTime.getUTCDate()}/${postTime.getUTCMonth() + 1}/${postTime.getUTCFullYear()}`;
        } else {
            // Hiển thị đầy đủ ngày, tháng, năm nếu hơn 7 ngày
            const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeek = daysOfWeek[postTime.getUTCDay()];
            timeAgoText = `${dayOfWeek}, ${postTime.getUTCDate()}/${postTime.getUTCMonth() + 1}/${postTime.getUTCFullYear()}`;
        }

        el.innerText = timeAgoText;
    });
});