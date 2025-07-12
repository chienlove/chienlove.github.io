import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  try {
    // Kiểm tra URL linh hoạt hơn
    if (!url || !/apps\.apple\.com/i.test(url)) {
      return res.status(400).json({ error: 'URL AppStore không hợp lệ' });
    }

    // Chuẩn hóa URL - loại bỏ query parameters nếu có
    const cleanUrl = url.split('?')[0];
    
    // Lấy app ID với regex cải tiến
    const appIdMatch = cleanUrl.match(/(?:id|app\/id)(\d+)/i);
    if (!appIdMatch) {
      return res.status(400).json({ 
        error: 'Không tìm thấy ID ứng dụng',
        details: `URL được cung cấp: ${url}`
      });
    }

    const appId = appIdMatch[1];
    const country = cleanUrl.match(/apple\.com\/([a-z]{2})\//i)?.[1] || 'us';

    // Gọi iTunes API
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    const response = await axios.get(itunesUrl, {
      timeout: 5000 // 5 giây timeout
    });

    if (!response.data?.results?.length) {
      return res.status(404).json({ 
        error: 'Ứng dụng không tồn tại hoặc không có thông tin',
        itunesUrl: itunesUrl
      });
    }

    const result = response.data.results[0];
    
    // Format response
    const appInfo = {
      name: result.trackName,
      version: result.version,
      author: result.artistName,
      size: result.fileSizeBytes ? (result.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Không rõ',
      description: result.description || result.releaseNotes || 'Không có mô tả',
      screenshots: result.screenshotUrls || [],
      icon: result.artworkUrl512 || result.artworkUrl100,
      minimumOsVersion: result.minimumOsVersion,
      primaryGenreName: result.primaryGenreName,
      // Thêm các trường khác
    };

    return res.status(200).json(appInfo);

  } catch (error) {
    console.error('AppStore API Error:', error.message);
    return res.status(500).json({ 
      error: 'Lỗi khi lấy thông tin từ AppStore',
      details: error.message
    });
  }
}