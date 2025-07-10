import axios from 'axios';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Thiếu tham số URL' });
    }

    if (!url.includes('testflight.apple.com')) {
      return res.status(400).json({ error: 'URL không hợp lệ, phải là link TestFlight' });
    }

    const { data } = await axios.get(url);
    const root = parse(data);

    // Hàm helper để lấy nội dung an toàn
    const safeText = (selector, defaultValue = 'Không rõ') => {
      const element = root.querySelector(selector);
      return element?.text?.trim() || defaultValue;
    };

    // Hàm helper để lấy thuộc tính an toàn
    const safeAttr = (selector, attr, defaultValue = '') => {
      const element = root.querySelector(selector);
      return element?.getAttribute(attr) || defaultValue;
    };

    // Lấy thông tin với xử lý lỗi
    const appInfo = {
      appName: safeText('h1'),
      developer: safeText('.name'),
      version: safeText('.version'),
      whatsNew: safeText('.change-log', 'Không có thông tin'),
      buildNumber: safeText('.build'),
      releaseDate: safeText('.release-date'),
      appIcon: safeAttr('.app-icon', 'src'),
      testFlightLink: url
    };

    // Kiểm tra xem có lấy được thông tin cơ bản không
    if (appInfo.appName === 'Không rõ' && appInfo.developer === 'Không rõ') {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy thông tin ứng dụng, có thể link không hợp lệ hoặc trang đã thay đổi'
      });
    }

    res.status(200).json({
      success: true,
      data: appInfo
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Không thể lấy thông tin ứng dụng',
      details: error.message,
      suggestion: 'Vui lòng kiểm tra lại URL hoặc thử lại sau'
    });
  }
};