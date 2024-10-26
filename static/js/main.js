document.addEventListener('DOMContentLoaded', function () {
    // Menu handling
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const mobileNav = document.querySelector('.mobile-nav');
    const sidebarOverlay = document.querySelector('.sidebar-overlay');

    hamburgerMenu.addEventListener('click', function () {
        mobileNav.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', function () {
        mobileNav.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });

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
    // Nếu bạn có content được load động, bạn có thể gọi processBlockquotes() sau khi load
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
});