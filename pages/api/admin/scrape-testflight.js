import axios from 'axios';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Missing URL parameter' });
    }

    if (!url.includes('testflight.apple.com')) {
      return res.status(400).json({ error: 'Invalid TestFlight URL' });
    }

    // Thêm headers để giả lập trình duyệt
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });

    const root = parse(data);

    // Selectors mới cập nhật (tháng 7/2024)
    const appInfo = {
      appName: root.querySelector('h1')?.text.trim() || 'Không rõ',
      developer: root.querySelector('.developer-name')?.text.trim() || 
                root.querySelector('h2')?.text.trim() || 'Không rõ',
      version: root.querySelector('.version-build')?.text.trim() || 
               root.querySelector('.build-version')?.text.trim() || 'Không rõ',
      whatsNew: root.querySelector('.change-log-text')?.text.trim() || 
               root.querySelector('.whats-new')?.text.trim() || 'Không có thông tin',
      buildNumber: root.querySelector('.build-number')?.text.trim() || 'Không rõ',
      releaseDate: root.querySelector('.release-date')?.text.trim() || 
                  root.querySelector('.date')?.text.trim() || 'Không rõ',
      appIcon: root.querySelector('.app-icon img')?.getAttribute('src') || 
               root.querySelector('.app-icon-source')?.getAttribute('src') || '',
      testFlightLink: url
    };

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      data: appInfo
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch app info',
      details: error.message
    });
  }
};