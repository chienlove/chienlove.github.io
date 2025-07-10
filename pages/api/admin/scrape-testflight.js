import axios from 'axios';

export default async (req, res) => {
  try {
    const { url, debug } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'Thiếu tham số URL' });
    }

    if (!url.includes('testflight.apple.com')) {
      return res.status(400).json({ error: 'URL không hợp lệ, phải là link TestFlight' });
    }

    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
      }
    });

    // Nếu có tham số debug thì trả về toàn bộ HTML
    if (debug === 'true') {
      res.setHeader('Content-Type', 'text/html');
      return res.send(data);
    }

    // Nếu không thì trả về JSON như bình thường
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json({
      success: true,
      html: data // Trả về HTML trong JSON (có thể bị cắt ngắn nếu quá dài)
    });

  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Không thể lấy thông tin ứng dụng',
      details: error.message
    });
  }
};