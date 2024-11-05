document.addEventListener('DOMContentLoaded', function () {
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
        const postTime = new Date(el.getAttribute('data-time'));
        const now = new Date();
        const diffMs = now - postTime;
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
            timeAgoText = `Hôm qua ${postTime.getHours()}:${postTime.getMinutes().toString().padStart(2, '0')}`;
        } else if (diffDays < 7) {
            const daysOfWeek = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const dayOfWeek = daysOfWeek[postTime.getDay()];
            timeAgoText = `${dayOfWeek}, ${postTime.getDate()}/${postTime.getMonth() + 1}/${postTime.getFullYear()}`;
        } else {
            timeAgoText = `${postTime.getDate()}/${postTime.getMonth() + 1}/${postTime.getFullYear()}`;
        }

        el.innerText = timeAgoText;
    });
});