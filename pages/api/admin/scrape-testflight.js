// vercel/api/testflight.js
const axios = require('axios');
const cheerio = require('cheerio');
const cache = require('memory-cache');

// Cấu hình
const CACHE_DURATION = 60 * 60 * 1000; // 1 giờ cache
const RATE_LIMIT_DELAY = 500; // 500ms giữa các request

module.exports = async (req, res) => {
  // Xử lý CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ 
      error: 'Missing TestFlight ID parameter',
      usage: '/api/testflight?id=TESTFLIGHT_ID' 
    });
  }

  // Kiểm tra cache trước
  const cached = cache.get(id);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  try {
    // Thêm delay để tránh rate limiting
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));

    const { data, headers } = await axios.get(`https://testflight.apple.com/join/${id}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: 5000
    });

    const $ = cheerio.load(data);
    
    // Xử lý tên ứng dụng tốt hơn
    let appName = $('title').text()
      .replace(' - TestFlight - Apple', '')
      .replace('Join the ', '')
      .replace('加入 Beta 版', '')
      .trim();

    // Phát hiện ngôn ngữ (Trung/Anh)
    const isChinese = data.includes('版本的测试员已满') || 
                      data.includes('版本目前不接受任何新测试员');

    // Xác định trạng thái
    let status = 'Y';
    if (isChinese) {
      if (data.includes('版本的测试员已满')) status = 'F';
      if (data.includes('版本目前不接受任何新测试员')) status = 'N';
    } else {
      if (data.includes('This beta is full')) status = 'F';
      if (data.includes("isn't accepting any new testers")) status = 'N';
    }

    // Cố gắng lấy phiên bản (nếu có)
    const versionMatch = data.match(/Version\s*([\d.]+)/i);
    const version = versionMatch?.[1] || null;

    // Cố gắng lấy ngày cập nhật
    const lastModified = headers['last-modified'] || null;

    // Chuẩn bị kết quả
    const result = {
      id,
      appName,
      status,
      version,
      lastModified,
      language: isChinese ? 'zh' : 'en',
      timestamp: new Date().toISOString()
    };

    // Lưu vào cache
    cache.put(id, result, CACHE_DURATION);

    res.json(result);

  } catch (error) {
    console.error(`Error checking TestFlight ${id}:`, error.message);
    
    if (error.response?.status === 404) {
      const notFoundResult = { 
        id, 
        status: 'D', 
        appName: null,
        error: 'TestFlight not found or removed'
      };
      cache.put(id, notFoundResult, CACHE_DURATION);
      return res.status(404).json(notFoundResult);
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      id
    });
  }
};