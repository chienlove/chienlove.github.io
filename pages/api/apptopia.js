const axios = require('axios');

// Hàm xử lý cào HTML từ Apptopia độc lập
async function getBundleIdFromApptopia(itunesId) {
    if (!itunesId) return null;

    try {
        const apptopiaUrl = `https://apptopia.com/ios/app/${itunesId}/about`;
        
        const response = await axios.get(apptopiaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br', // Ép nén giảm dung lượng
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'no-cache'
            },
            decompress: true, 
            timeout: 5000 // Timeout an toàn 5s cho Vercel
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
        console.error(`[Lỗi cào Apptopia ID ${itunesId}]:`, error.message);
    }
    
    return null;
}

// --- HANDLER NEXT.JS ĐỘC LẬP CHỈ ĐỂ TEST ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ GET' });

    const itunesId = req.query.id;

    if (!itunesId) {
        return res.status(400).json({ 
            success: false, 
            message: 'Thiếu tham số ID. Thử lại với: /api/test-apptopia?id=6741710156' 
        });
    }

    const startTime = Date.now();
    const bundleId = await getBundleIdFromApptopia(itunesId);
    const executionTime = Date.now() - startTime;

    if (bundleId) {
        return res.status(200).json({
            success: true,
            itunesId: itunesId,
            bundleId: bundleId,
            timeTaken: `${executionTime}ms`
        });
    } else {
        return res.status(404).json({
            success: false,
            itunesId: itunesId,
            bundleId: null,
            timeTaken: `${executionTime}ms`,
            message: 'Không lấy được Bundle ID (Có thể do app không tồn tại hoặc Apptopia chặn IP Vercel).'
        });
    }
}
