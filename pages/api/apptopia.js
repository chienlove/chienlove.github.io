const axios = require('axios');

// Hàm core xử lý cào HTML từ Apptopia
async function getBundleIdFromApptopia(itunesId) {
    if (!itunesId) return null;

    try {
        const apptopiaUrl = `https://apptopia.com/ios/app/${itunesId}/about`;
        
        const response = await axios.get(apptopiaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br', // Rất quan trọng để tối ưu tốc độ trên Vercel
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'no-cache'
            },
            decompress: true, 
            timeout: 5000 // Serverless function trên Vercel (bản free) có limit 10s, ta set 5s cho an toàn
        });

        // Bóc tách JSON
        const match = response.data.match(/data-about-page-data="([^"]+)"/);
        
        if (match && match[1]) {
            const jsonString = match[1].replace(/&quot;/g, '"');
            const data = JSON.parse(jsonString);
            
            const bundleId = data?.assets?.app_about?.other_data?.bundle_id;
            return bundleId || null;
        }

    } catch (error) {
        console.error(`[Lỗi cào dữ liệu ID ${itunesId}]:`, error.message);
    }
    
    return null;
}

// Hàm Handler chuẩn của Vercel Serverless
module.exports = async function handler(req, res) {
    // Cấu hình CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Thiếu tham số ID. Vui lòng truy cập theo dạng: /api/test-bundle?id=6741710156' 
        });
    }

    const startTime = Date.now();
    const bundleId = await getBundleIdFromApptopia(id);
    const executionTime = Date.now() - startTime;

    if (bundleId) {
        return res.status(200).json({
            success: true,
            itunesId: id,
            bundleId: bundleId,
            timeTaken: `${executionTime}ms`
        });
    } else {
        return res.status(404).json({
            success: false,
            itunesId: id,
            bundleId: null,
            timeTaken: `${executionTime}ms`,
            message: 'Không lấy được Bundle ID (Có thể do app không tồn tại hoặc bot bị chặn).'
        });
    }
};
