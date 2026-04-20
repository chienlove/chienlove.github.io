const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAppRaven(keyword) {
    try {
        console.log(`[1] Đang tìm ID nội bộ của AppRaven qua hệ thống tìm kiếm...`);
        
        // Sử dụng DuckDuckGo bản HTML (nhẹ, ít bị block) để tìm đường dẫn
        // Cú pháp: site:appraven.net/app/ "Từ khóa"
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:appraven.net/app/+${encodeURIComponent(keyword)}`;
        
        const ddgResponse = await axios.get(searchUrl, {
            headers: { 
                // Giả lập trình duyệt máy tính
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' 
            }
        });

        // Dùng Biểu thức chính quy (Regex) quét trực tiếp mã nguồn để tóm lấy link AppRaven
        const linkMatch = ddgResponse.data.match(/https?:\/\/(?:www\.)?appraven\.net\/app\/\d+/i);
        
        if (!linkMatch) {
            console.log('❌ Không tìm thấy ứng dụng này trên hệ thống của AppRaven.');
            return null;
        }

        const appRavenUrl = linkMatch[0];
        console.log(`✅ Tìm thấy link chuẩn: ${appRavenUrl}`);
        console.log(`[2] Đang tải và bóc tách hình ảnh, dữ liệu...`);

        // Tải trang chi tiết của AppRaven
        const detailResponse = await axios.get(appRavenUrl, {
            headers: { 
                // Giả lập iPhone để web AppRaven trả về giao diện mobile dễ cào hơn
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)' 
            }
        });

        const $ = cheerio.load(detailResponse.data);
        
        // Lấy tên App (Nằm trên thẻ title hoặc thẻ h1)
        let appName = $('title').text().replace('- AppRaven', '').trim();
        if (!appName) {
            appName = $('h1').text().trim();
        }

        const mzstaticLinks = [];
        
        // Quét toàn bộ ảnh trên trang web, chỉ nhặt những ảnh thuộc CDN Apple
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('mzstatic.com/image/thumb')) {
                mzstaticLinks.push(src);
            }
        });

        // Xóa các link ảnh bị trùng lặp
        const uniqueLinks = [...new Set(mzstaticLinks)];
        
        // Phân loại: Ảnh đầu tiên AppRaven load thường là Icon, phần còn lại là Screenshots
        const iconUrl = uniqueLinks.length > 0 ? uniqueLinks[0] : null;
        const screenshots = uniqueLinks.length > 1 ? uniqueLinks.slice(1) : [];

        return {
            appleIdOrKeyword: keyword,
            appRavenSource: appRavenUrl,
            appName,
            icon: iconUrl,
            screenshots
        };

    } catch (error) {
        console.error('❌ Có lỗi xảy ra:', error.message);
        return null;
    }
}

// === CHẠY THỬ NGHIỆM ===
// Bạn có thể truyền vào App ID (VD: Facebook - 284882215) hoặc Tên ứng dụng (VD: "Flappy Bird")
const input = "284882215"; 

scrapeAppRaven(input).then(data => {
    if (data) {
        console.log('\n=== KẾT QUẢ TRÍCH XUẤT ===');
        console.log(JSON.stringify(data, null, 2));
    }
});
