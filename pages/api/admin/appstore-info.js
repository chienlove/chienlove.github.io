import axios from 'axios';

export default async function handler(req, res) {
  console.log(`[API] Request received: Method=${req.method}, URL=${req.url}`);

  if (req.method !== 'POST') {
    console.log(`[API] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { url } = req.body;
  console.log(`[API] Processing URL: ${url}`);

  try {
    if (!url || typeof url !== 'string') {
      console.log('[API] Invalid URL: URL is empty or not a string');
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    if (!/apps\.apple\.com/i.test(url)) {
      console.log('[API] Invalid App Store URL: Does not contain apps.apple.com');
      return res.status(400).json({ error: 'URL phải là từ App Store (apps.apple.com)' });
    }

    const cleanUrl = url.split('?')[0].split('#')[0];
    console.log('[API] Clean URL:', cleanUrl);

    let appIdMatch = null;
    const patterns = [
      /\/id(\d+)/i,
      /\/app\/[^\/]+\/id(\d+)/i,
      /\/us\/app\/[^\/]+\/id(\d+)/i,
      /\/[a-z]{2}\/app\/[^\/]+\/id(\d+)/i,
      /app\/id(\d+)/i,
      /id(\d+)/i
    ];

    for (const pattern of patterns) {
      appIdMatch = cleanUrl.match(pattern);
      if (appIdMatch) {
        console.log('[API] Matched pattern:', pattern, 'App ID:', appIdMatch[1]);
        break;
      }
    }

    if (!appIdMatch || !appIdMatch[1]) {
      console.log('[API] App ID not found in URL');
      return res.status(400).json({
        error: 'Không tìm thấy ID ứng dụng trong URL',
        details: `URL được cung cấp: ${url}`,
        cleanUrl: cleanUrl
      });
    }

    const appId = appIdMatch[1];
    const countryMatch = cleanUrl.match(/apple\.com\/([a-z]{2})\//i);
    const country = countryMatch ? countryMatch[1] : 'us';
    
    console.log('[API] Extracted App ID:', appId, 'Country:', country);

    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
    console.log('[API] iTunes URL:', itunesUrl);
    
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        response = await axios.get(itunesUrl, { 
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        console.log(`[API] iTunes API Response status: ${response.status}`);
        break;
      } catch (error) {
        retryCount++;
        console.error(`[API] Retry ${retryCount}/${maxRetries} for iTunes API. Error: ${error.message}`);
        if (retryCount >= maxRetries) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    if (!response.data || !response.data.results || !Array.isArray(response.data.results)) {
      console.log('[API] Invalid iTunes API response data structure');
      return res.status(404).json({
        error: 'Phản hồi từ iTunes API không hợp lệ',
        itunesUrl,
        responseData: response.data
      });
    }

    if (response.data.results.length === 0) {
      console.log('[API] App not found with this ID');
      return res.status(404).json({
        error: 'Không tìm thấy ứng dụng với ID này',
        appId,
        itunesUrl
      });
    }

    const result = response.data.results[0];
    console.log('[API] App result:', JSON.stringify(result, null, 2));

    if (!result.trackName) {
      console.log('[API] Incomplete app data: Missing trackName');
      return res.status(404).json({
        error: 'Dữ liệu ứng dụng không đầy đủ (thiếu tên ứng dụng)',
        result
      });
    }

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

    console.log('[API] Final app info:', JSON.stringify(appInfo, null, 2));
    return res.status(200).json(appInfo);

  } catch (error) {
    console.error('[API] AppStore API Error caught:', error);
    
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
    
    console.error('[API] Detailed error details:', JSON.stringify(errorDetails, null, 2));
    
    return res.status(500).json({
      error: 'Lỗi khi lấy thông tin từ AppStore',
      details: error.message,
      type: error.constructor.name,
      url: req.body.url
    });
  }
}

