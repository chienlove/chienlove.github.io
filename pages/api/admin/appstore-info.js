import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  try {
    // Kiểm tra URL hợp lệ
    if (!url || !/apps\.apple\.com/i.test(url)) {
      return res.status(400).json({ error: 'URL AppStore không hợp lệ' });
    }

    // Loại bỏ query string nếu có
    const cleanUrl = url.split('?')[0];

    // Trích xuất app ID từ URL
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
    const response = await axios.get(itunesUrl, { timeout: 5000 });

    if (!response.data?.results?.length) {
      return res.status(404).json({
        error: 'Ứng dụng không tồn tại hoặc không có thông tin',
        itunesUrl
      });
    }

    const result = response.data.results[0];

    // Format kết quả trả về
    const appInfo = {
      name: result.trackName,
      version: result.version,
      bundleId: result.bundleId,
      appId: result.trackId,
      author: result.artistName,
      seller: result.sellerName,
      releaseDate: result.currentVersionReleaseDate,
      size: result.fileSizeBytes ? (result.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Không rõ',
      description: result.description || result.releaseNotes || 'Không có mô tả',
      releaseNotes: result.releaseNotes || '',
      screenshots: result.screenshotUrls || [],
      ipadScreenshots: result.ipadScreenshotUrls || [],
      icon: result.artworkUrl512 || result.artworkUrl100,
      minimumOsVersion: result.minimumOsVersion,
      genre: result.primaryGenreName,
      genreIds: result.genreIds,
      rating: result.averageUserRating || 0,
      ratingCount: result.userRatingCount || 0,
      price: result.formattedPrice || 'Free',
      currency: result.currency,
      trackViewUrl: result.trackViewUrl,
      supportedDevices: result.supportedDevices || [],
      languages: result.languageCodesISO2A || [],
      ageRating: result.contentAdvisoryRating || '',
      gameCenter: result.isGameCenterEnabled || false,
      features: result.features || [],
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