import axios from 'axios';
import { parse } from 'node-html-parser';

export default async (req, res) => {
  try {
    // Lấy URL từ query parameter
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Thiếu tham số URL' });
    }

    // Kiểm tra xem URL có phải là TestFlight không
    if (!url.includes('testflight.apple.com')) {
      return res.status(400).json({ error: 'URL không hợp lệ, phải là link TestFlight' });
    }

    // Fetch HTML từ TestFlight
    const { data } = await axios.get(url);
    const root = parse(data);

    // Trích xuất thông tin
    const appName = root.querySelector('h1').text.trim();
    const developer = root.querySelector('.name').text.trim();
    const version = root.querySelector('.version').text.trim();
    const whatsNew = root.querySelector('.change-log')?.text.trim() || 'Không có thông tin';
    const buildNumber = root.querySelector('.build')?.text.trim() || 'Không rõ';
    const releaseDate = root.querySelector('.release-date')?.text.trim() || 'Không rõ';
    const appIcon = root.querySelector('.app-icon').getAttribute('src');

    // Trả về kết quả
    res.status(200).json({
      success: true,
      data: {
        appName,
        developer,
        version,
        buildNumber,
        whatsNew,
        releaseDate,
        appIcon,
        testFlightLink: url
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Không thể lấy thông tin ứng dụng',
      details: error.message 
    });
  }
};