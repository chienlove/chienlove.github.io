const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Hàm core xử lý cào HTML từ Apptopia bằng Regex
async function getBundleIdFromApptopia(itunesId) {
    if (!itunesId) return null;

    try {
        console.log(`[Đang xử lý] Đang cào dữ liệu từ Apptopia cho ID: ${itunesId}...`);
        const apptopiaUrl = `https://apptopia.com/ios/app/${itunesId}/about`;
        
        const response = await axios.get(apptopiaUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br', // Ép nén để giảm dung lượng tải
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Cache-Control': 'no-cache' // Chống bị dính cache cũ
            },
            decompress: true, 
            timeout: 5000 // Giới hạn 5 giây
        });

        // Tìm chuỗi JSON nằm trong thuộc tính data-about-page-data
        const match = response.data.match(/data-about-page-data="([^"]+)"/);
        
        if (match && match[1]) {
            const jsonString = match[1].replace(/&quot;/g, '"');
            const data = JSON.parse(jsonString);
            
            // Moi Bundle ID ra từ Object
            const bundleId = data?.assets?.app_about?.other_data?.bundle_id;
            return bundleId || null;
        }

    } catch (error) {
        // Bắt lỗi nếu bị chặn (403) hoặc quá thời gian (Timeout)
        console.error(`[Lỗi] Quá trình cào ID ${itunesId} thất bại: ${error.message}`);
    }
    
    return null;
}

// Khởi tạo Endpoint API GET
app.get('/api/bundle', async (req, res) => {
    // Set Header để trình duyệt hiển thị JSON đẹp hơn
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ 
            success: false, 
            message: 'Thiếu tham số ID. Vui lòng thử lại với /api/bundle?id=6741710156' 
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
            timeTaken: `${executionTime}ms`,
            message: 'Lấy Bundle ID thành công!'
        });
    } else {
        return res.status(404).json({
            success: false,
            itunesId: id,
            bundleId: null,
            timeTaken: `${executionTime}ms`,
            message: 'Không lấy được Bundle ID (Có thể do app không tồn tại hoặc Apptopia chặn bot).'
        });
    }
});

// Chạy Server
app.listen(PORT, () => {
    console.log(`=========================================`);
    console.log(`🚀 API Test Server đang chạy tại PORT ${PORT}`);
    console.log(`👉 Hãy mở trình duyệt và truy cập link sau:`);
    console.log(`   http://localhost:${PORT}/api/bundle?id=6741710156`);
    console.log(`=========================================`);
});
