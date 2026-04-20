const axios = require('axios');
const cheerio = require('cheerio');

// 1. Giữ nguyên hàm cào dữ liệu của bạn
async function scrapeAppRaven(keyword) {
    try {
        console.log(`[1] Đang tìm ID nội bộ của AppRaven qua hệ thống tìm kiếm...`);
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:appraven.net/app/+${encodeURIComponent(keyword)}`;
        
        const ddgResponse = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });

        const linkMatch = ddgResponse.data.match(/https?:\/\/(?:www\.)?appraven\.net\/app\/\d+/i);
        if (!linkMatch) return null;

        const appRavenUrl = linkMatch[0];
        
        const detailResponse = await axios.get(appRavenUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)' }
        });

        const $ = cheerio.load(detailResponse.data);
        
        let appName = $('title').text().replace('- AppRaven', '').trim() || $('h1').text().trim();

        const mzstaticLinks = [];
        $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src && src.includes('mzstatic.com/image/thumb')) {
                mzstaticLinks.push(src);
            }
        });

        const uniqueLinks = [...new Set(mzstaticLinks)];
        return {
            appleIdOrKeyword: keyword,
            appRavenSource: appRavenUrl,
            appName,
            icon: uniqueLinks.length > 0 ? uniqueLinks[0] : null,
            screenshots: uniqueLinks.length > 1 ? uniqueLinks.slice(1) : []
        };
    } catch (error) {
        console.error('❌ Có lỗi xảy ra:', error.message);
        return null;
    }
}

// 2. Export hàm xử lý (Handler) theo chuẩn của Vercel
module.exports = async (req, res) => {
    // Chỉ cho phép method GET để dễ test trên trình duyệt
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Chỉ hỗ trợ method GET' });
    }

    // Lấy ID từ tham số URL (vd: ?id=284882215). Nếu không có, báo lỗi.
    const appId = req.query.id;
    
    if (!appId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng cung cấp App ID. Ví dụ: /api/raven?id=284882215' 
        });
    }

    try {
        const data = await scrapeAppRaven(appId);
        
        if (data) {
            // Trả về JSON chứa data lấy được
            res.status(200).json({
                success: true,
                data: data
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu ứng dụng trên AppRaven'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};
