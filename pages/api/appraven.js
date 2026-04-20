const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeAppRaven(keyword) {
    try {
        console.log(`[1] Đang tìm ID nội bộ của AppRaven qua hệ thống tìm kiếm...`);
        
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:appraven.net/app/+${encodeURIComponent(keyword)}`;
        
        const ddgResponse = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7'
            }
        });

        const linkMatch = ddgResponse.data.match(/https?:\/\/(?:www\.)?appraven\.net\/app\/\d+/i);
        
        if (!linkMatch) {
            return null; // Không tìm thấy
        }

        const appRavenUrl = linkMatch[0];
        console.log(`✅ Tìm thấy link chuẩn: ${appRavenUrl}`);
        
        const detailResponse = await axios.get(appRavenUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1' 
            }
        });

        const $ = cheerio.load(detailResponse.data);
        
        let appName = $('title').text().replace('- AppRaven', '').trim();
        if (!appName) {
            appName = $('h1').text().trim();
        }

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
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
        console.error('❌ Lỗi trong lúc scrape:', errorMsg);
        throw new Error(`Lỗi khi lấy dữ liệu: ${errorMsg}`);
    }
}

// Sửa lại thành export default theo đúng chuẩn của Next.js API Routes
export default async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ method GET' });
    }

    const appId = req.query.id;
    
    if (!appId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Vui lòng cung cấp App ID. Ví dụ: /api/appraven?id=284882215' 
        });
    }

    try {
        const data = await scrapeAppRaven(appId);
        
        if (data) {
            return res.status(200).json({
                success: true,
                data: data
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy dữ liệu ứng dụng này trên kho AppRaven'
            });
        }
    } catch (error) {
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
