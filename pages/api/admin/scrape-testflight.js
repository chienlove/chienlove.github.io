// vercel/api/testflight.js
const axios = require('axios');
const cheerio = require('cheerio');
const cache = require('memory-cache');

// Cấu hình
const CACHE_DURATION = 60 * 60 * 1000; // 1 giờ cache
const REQUEST_TIMEOUT = 10000; // 10s timeout

const enableCORS = fn => async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return await fn(req, res);
};

module.exports = enableCORS(async (req, res) => {
  console.log('Incoming request for TestFlight ID:', req.query.id);

  const { id } = req.query;
  
  if (!id) {
    console.warn('Missing ID parameter');
    return res.status(400).json({ 
      error: 'Missing TestFlight ID parameter',
      usage: '/api/testflight?id=TESTFLIGHT_ID' 
    });
  }

  // Kiểm tra cache
  const cached = cache.get(id);
  if (cached) {
    console.log(`Returning cached data for ${id}`);
    return res.json({ ...cached, cached: true });
  }

  try {
    const { data, headers } = await axios.get(`https://testflight.apple.com/join/${id}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      timeout: REQUEST_TIMEOUT,
      validateStatus: (status) => status < 500 // Chấp nhận cả 404
    });

    console.log(`Fetched data for ${id}, length: ${data.length}`);

    const $ = cheerio.load(data);
    let appName = $('title').text()
      .replace(' - TestFlight - Apple', '')
      .replace('Join the ', '')
      .replace('加入 Beta 版', '')
      .trim();

    // Phát hiện ngôn ngữ
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

    const result = {
      id,
      appName: appName || 'Unknown App',
      status,
      timestamp: new Date().toISOString(),
      language: isChinese ? 'zh' : 'en'
    };

    cache.put(id, result, CACHE_DURATION);
    console.log(`Success response for ${id}`, result);
    return res.json(result);

  } catch (error) {
    console.error(`Error for ${id}:`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });

    if (error.response?.status === 404) {
      const notFoundResult = { 
        id, 
        status: 'D', 
        appName: null,
        error: 'Not found'
      };
      cache.put(id, notFoundResult, CACHE_DURATION);
      return res.status(404).json(notFoundResult);
    }

    return res.status(500).json({
      error: 'Internal Server Error',
      message: error.message,
      id,
      timestamp: new Date().toISOString()
    });
  }
});