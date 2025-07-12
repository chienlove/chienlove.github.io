import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { appStoreUrl } = req.body;

  try {
    // Validate URL
    if (!appStoreUrl || !appStoreUrl.includes('apps.apple.com')) {
      return res.status(400).json({ error: 'URL App Store không hợp lệ' });
    }

    // Extract app ID from URL
    const appIdMatch = appStoreUrl.match(/id(\d+)/);
    if (!appIdMatch) {
      return res.status(400).json({ error: 'Không tìm thấy ID ứng dụng trong URL' });
    }
    const appId = appIdMatch[1];

    // Fetch from Apple App Store API
    const response = await axios.get(`https://itunes.apple.com/lookup?id=${appId}&country=vn`);
    const result = response.data.results?.[0];

    if (!result) {
      return res.status(404).json({ error: 'Không tìm thấy thông tin ứng dụng' });
    }

    // Format response
    const appInfo = {
      name: result.trackName,
      version: result.version,
      author: result.artistName,
      size: (result.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB',
      description: result.description,
      screenshots: result.screenshotUrls || [],
      icon: result.artworkUrl512 || result.artworkUrl100,
      // Thêm các trường khác nếu cần
    };

    return res.status(200).json(appInfo);
  } catch (error) {
    console.error('Error fetching App Store info:', error);
    return res.status(500).json({ error: 'Lỗi khi lấy thông tin từ App Store' });
  }
}