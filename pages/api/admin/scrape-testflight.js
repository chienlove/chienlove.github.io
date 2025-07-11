// pages/api/admin/scrape-testflight.js
import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  const { id } = req.query;

  try {
    const { data } = await axios.get(`https://testflight.apple.com/join/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    const $ = cheerio.load(data);
    
    // 1. Thông tin cơ bản
    const appName = $('title').text()
      .replace(' - TestFlight - Apple', '')
      .replace('Join the ', '')
      .trim();

    // 2. Phát hiện phiên bản (nếu có)
    const versionText = $('.version-info').text() || '';
    const versionMatch = versionText.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : null;

    // 3. Lấy screenshot (nếu có)
    const screenshots = [];
    $('.screenshot-container img').each((i, el) => {
      const src = $(el).attr('src');
      if (src) screenshots.push(src.startsWith('http') ? src : `https://testflight.apple.com${src}`);
    });

    // 4. Trạng thái chi tiết
    let status = 'Y';
    let statusMessage = 'Available';
    if (data.includes('This beta is full')) {
      status = 'F';
      statusMessage = 'Full';
    } else if (data.includes("isn't accepting any new testers")) {
      status = 'N';
      statusMessage = 'Not Accepting';
    }

    // 5. Metadata khác
    const metadata = {
      lastUpdated: $('.build-info time').attr('datetime'),
      buildNumber: $('.build-number').text().trim(),
      rating: $('.rating').text().trim()
    };

    return res.status(200).json({
      success: true,
      id,
      appName,
      status,
      statusMessage,
      version,
      screenshots,
      metadata,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scrape Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      id
    });
  }
}