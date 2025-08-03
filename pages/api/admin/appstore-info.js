import axios from 'axios';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  try {
    // Kiểm tra URL hợp lệ với nhiều pattern khác nhau
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    // Kiểm tra xem có phải URL App Store không
    if (!/apps\.apple\.com/i.test(url)) {
      return res.status(400).json({ error: 'URL phải là từ App Store (apps.apple.com)' });
    }

    // Loại bỏ query string và fragment
    const cleanUrl = url.split('?')[0].split('#')[0];
    console.log('Clean URL:', cleanUrl);

    // Trích xuất app ID từ URL với nhiều pattern khác nhau
    let appIdMatch = null;
    const patterns = [
      /\/id(\d+)/i,                    // /id123456789
      /\/app\/[^\/]+\/id(\d+)/i,       // /app/app-name/id123456789
      /\/us\/app\/[^\/]+\/id(\d+)/i,   // /us/app/app-name/id123456789
      /\/[a-z]{2}\/app\/[^\/]+\/id(\d+)/i, // /country/app/app-name/id123456789
      /app\/id(\d+)/i,                 // app/id123456789
      /id(\d+)/i                       // id123456789
    ];

    for (const pattern of patterns) {
      appIdMatch = cleanUrl.match(pattern);
      if (appIdMatch) {
        console.log('Matched pattern:', pattern, 'App ID:', appIdMatch[1]);
        break;
      }
    }

    if (!appIdMatch || !appIdMatch[1]) {
      return res.status(400).json({
        error: 'Không tìm thấy ID ứng dụng trong URL',
        details: `URL được cung cấp: ${url}`,
        cleanUrl: cleanUrl
      });
    }

    const appId = appIdMatch[1];
    
    // Trích xuất country code từ URL
    const countryMatch = cleanUrl.match(/apple\.com\/([a-z]{2})\//i);
    const country = countryMatch ? countryMatch[1] : 'us';
    
    console.log('App ID:', appId, 'Country:', country);

    // Gọi iTunes API với timeout dài hơn và retry logic
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    console.log('iTunes URL:', itunesUrl);
    
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await axios.get(itunesUrl, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        break;
      } catch (error) {
        retryCount++;
        console.log(`Retry ${retryCount}/${maxRetries} for iTunes API`);
        if (retryCount >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }

    console.log('iTunes API Response status:', response.status);
    console.log('iTunes API Response data:', JSON.stringify(response.data, null, 2));

    if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
      return res.status(404).json({
        error: 'Phản hồi từ iTunes API không hợp lệ',
        itunesUrl,
        responseData: response.data
      });
    }

    if (response.data.results.length === 0) {
      return res.status(404).json({
        error: 'Không tìm thấy ứng dụng với ID này',
        appId,
        itunesUrl
      });
    }

    const result = response.data.results[0];
    console.log('App result:', JSON.stringify(result, null, 2));

    // Validate required fields
    if (!result.trackName) {
      return res.status(404).json({
        error: 'Dữ liệu ứng dụng không đầy đủ',
        result
      });
    }

    // Format kết quả trả về với safe access
    const appInfo = {
      name: result.trackName || '',
      version: result.version || '',
      bundleId: result.bundleId || '',
      appId: result.trackId || appId,
      author: result.artistName || '',
      seller: result.sellerName || '',
      releaseDate: result.currentVersionReleaseDate || result.releaseDate || '',
      size: result.fileSizeBytes ? (result.fileSizeBytes / (1024 * 1024)).toFixed(2) + ' MB' : 'Không rõ',
      description: result.description || result.releaseNotes || 'Không có mô tả',
      releaseNotes: result.releaseNotes || '',
      screenshots: Array.isArray(result.screenshotUrls) ? result.screenshotUrls : [],
      ipadScreenshots: Array.isArray(result.ipadScreenshotUrls) ? result.ipadScreenshotUrls : [],
      icon: result.artworkUrl512 || result.artworkUrl100 || result.artworkUrl60 || '',
      minimumOsVersion: result.minimumOsVersion || '',
      genre: result.primaryGenreName || '',
      genreIds: Array.isArray(result.genreIds) ? result.genreIds : [],
      rating: result.averageUserRating || 0,
      ratingCount: result.userRatingCount || 0,
      price: result.formattedPrice || result.price || 'Free',
      currency: result.currency || '',
      trackViewUrl: result.trackViewUrl || url,
      supportedDevices: Array.isArray(result.supportedDevices) ? result.supportedDevices : [],
      languages: Array.isArray(result.languageCodesISO2A) ? result.languageCodesISO2A : [],
      ageRating: result.contentAdvisoryRating || result.trackContentRating || '',
      gameCenter: result.isGameCenterEnabled || false,
      features: Array.isArray(result.features) ? result.features : [],
    };

    console.log('Final app info:', JSON.stringify(appInfo, null, 2));
    return res.status(200).json(appInfo);

  } catch (error) {
    console.error('AppStore API Error:', error);
    
    // Detailed error logging
    const errorDetails = {
      message: error.message,
      code: error.code,
      response: error.response ? {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      } : null,
      stack: error.stack
    };
    
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    
    return res.status(500).json({
      error: 'Lỗi khi lấy thông tin từ AppStore',
      details: error.message,
      type: error.constructor.name,
      url: req.body.url
    });
  }
}

