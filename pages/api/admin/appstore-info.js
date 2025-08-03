// File: pages/api/admin/appstore-info.js

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log(`[API] Request received: Method=${req.method}, URL=${req.url}`);

  if (req.method !== 'POST') {
    console.log(`[API] Method Not Allowed: ${req.method}`);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { url } = req.body;
  console.log(`[API] Processing URL: ${url}`);

  try {
    // Validate input
    if (!url || typeof url !== 'string') {
      console.log('[API] Invalid URL: URL is empty or not a string');
      return res.status(400).json({ error: 'URL không hợp lệ' });
    }

    if (!/apps\.apple\.com/i.test(url)) {
      console.log('[API] Invalid App Store URL: Does not contain apps.apple.com');
      return res.status(400).json({ error: 'URL phải là từ App Store (apps.apple.com)' });
    }

    // Clean URL - remove query params and fragments
    const cleanUrl = url.split('?')[0].split('#')[0];
    console.log('[API] Clean URL:', cleanUrl);

    // Extract App ID using multiple patterns
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
        console.log('[API] Matched pattern:', pattern.toString(), 'App ID:', appIdMatch[1]);
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
    
    // Extract country code (default to 'us')
    const countryMatch = cleanUrl.match(/apple\.com\/([a-z]{2})\//i);
    const country = countryMatch ? countryMatch[1].toLowerCase() : 'us';
    
    console.log('[API] Extracted App ID:', appId, 'Country:', country);

    // Call iTunes API
    const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}&entity=software`;
    console.log('[API] iTunes API URL:', itunesUrl);
    
    const apiResponse = await fetch(itunesUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      }
    });
    
    console.log(`[API] iTunes API Response status: ${apiResponse.status}`);
    
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('[API] iTunes API Error response:', errorText);
      throw new Error(`iTunes API returned ${apiResponse.status}: ${apiResponse.statusText}`);
    }
    
    const responseData = await apiResponse.json();
    console.log('[API] iTunes API Response data:', JSON.stringify(responseData, null, 2));

    if (!responseData || !responseData.results || !Array.isArray(responseData.results)) {
      console.log('[API] Invalid iTunes API response structure');
      return res.status(404).json({
        error: 'Phản hồi từ iTunes API không hợp lệ',
        itunesUrl,
        responseData: responseData
      });
    }

    if (responseData.results.length === 0) {
      console.log('[API] App not found with this ID');
      return res.status(404).json({
        error: 'Không tìm thấy ứng dụng với ID này',
        appId,
        itunesUrl
      });
    }

    const result = responseData.results[0];
    console.log('[API] App result found:', result.trackName || 'Unknown');

    // Validate required fields
    if (!result.trackName) {
      console.log('[API] Incomplete app data: Missing trackName');
      return res.status(404).json({
        error: 'Dữ liệu ứng dụng không đầy đủ (thiếu tên ứng dụng)',
        result
      });
    }

    // Format response data
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

    console.log('[API] Final app info prepared for:', appInfo.name);
    return res.status(200).json(appInfo);

  } catch (error) {
    console.error('[API] Error caught:', error);
    
    return res.status(500).json({
      error: 'Lỗi khi lấy thông tin từ AppStore',
      details: error.message,
      type: error.name,
      url: url || 'unknown'
    });
  }
}