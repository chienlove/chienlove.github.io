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

  // --- Helpers: Apple HTML screenshot fallback (iPhone only) ---
  const isProbablyPlaceholder = (u) =>
    typeof u === 'string' &&
    (u.includes('Placeholder.mill') || u.endsWith('/400x400bb.webp'));

  const normalizeBaseMzStaticUrl = (u) => {
    if (!u || typeof u !== 'string') return null;
    // strip query/hash
    const clean = u.split('?')[0].split('#')[0];
    // if already has /{WxH}bb.xxx suffix -> remove it to get base
    return clean.replace(/\/\d{3,4}x\d{3,4}bb\.(png|jpg|jpeg|webp)$/i, '');
  };

  const isIpadShot = (u) => {
    const s = (u || '').toLowerCase();
    return (
      s.includes('ipad') ||
      s.includes('u0028ipad') ||
      s.includes('ipad_') ||
      s.includes('ipad-pro') ||
      s.includes('ipad%20') ||
      s.includes('ipad_pro')
    );
  };

  const isAppIcon = (u) => {
    const s = (u || '').toLowerCase();
    return s.includes('appicon') || s.includes('artwork') || s.includes('/purple') && s.includes('appicon');
  };

  const extractIphoneScreenshotBasesFromHtml = (html) => {
    if (!html || typeof html !== 'string') return [];
    // Grab any mzstatic image URLs that look like screenshots or feature graphics
    const matches = html.match(/https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'\\\s]+/g) || [];
    const bases = [];
    for (const m of matches) {
      const base = normalizeBaseMzStaticUrl(m);
      if (!base) continue;

      const lower = base.toLowerCase();

      // must be an image/thumb asset
      if (!lower.includes('/image/thumb/')) continue;

      // drop obvious non-screenshot assets
      if (lower.includes('placeholder.mill')) continue;
      if (lower.includes('promotional') || lower.includes('marketing')) continue;
      if (isAppIcon(base)) continue;

      // prefer screenshot-ish collections (PurpleSource*, Features*)
      const looksLikeShot = lower.includes('purplesource') || lower.includes('/features');
      if (!looksLikeShot) continue;

      // iPhone only
      if (isIpadShot(base)) continue;

      bases.push(base);
    }
    // unique by base url
    return Array.from(new Set(bases));
  };

  const buildIphoneSizedUrls = (bases) => {
    // One "best" size per screenshot base to avoid duplicates.
    // Chosen to render well in admin + matches common iPhone screenshot sizes.
    const preferredSizes = [
      '1290x2796bb.png', // newer iPhones
      '1242x2688bb.png',
      '1179x2556bb.png',
      '1170x2532bb.png',
      '1284x2778bb.png',
      '1125x2436bb.png',
      '1080x2340bb.png',
      '828x1792bb.png',
    ];
    const out = [];
    for (const b of bases || []) {
      // always pick the first preferred size; Apple CDN usually serves it if that screenshot exists
      out.push(`${b}/${preferredSizes[0]}`);
    }
    return out;
  };

  const fetchAppleHtmlIphoneScreenshots = async ({ trackViewUrl, appId, country }) => {
    const baseUrl =
      trackViewUrl ||
      (appId ? `https://apps.apple.com/${country || 'us'}/app/id${appId}` : null);

    if (!baseUrl) return { screenshots: [], notes: ['noBaseUrl'] };

    const notes = [];
    try {
      const resp = await fetch(baseUrl, {
        redirect: 'follow',
        headers: {
          // Apple sometimes returns different HTML for "bots" – this UA helps.
          'user-agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
          'accept-language': 'en-US,en;q=0.9,vi;q=0.8',
        },
      });

      notes.push(`HTTP ${resp.status} ${resp.ok ? 'OK' : 'NOT_OK'}`);
      notes.push(`finalUrl=${resp.url || baseUrl}`);

      if (!resp.ok) return { screenshots: [], notes };

      const html = await resp.text();
      notes.push(`htmlLength=${html.length}`);

      const bases = extractIphoneScreenshotBasesFromHtml(html);
      notes.push(`baseUrls=${bases.length}`);

      const sized = buildIphoneSizedUrls(bases);
      // unique + limit
      const uniq = Array.from(new Set(sized)).slice(0, 10);
      notes.push(`finalScreenshots=${uniq.length}`);

      return { screenshots: uniq, notes };
    } catch (e) {
      notes.push(`error=${e?.message || String(e)}`);
      return { screenshots: [], notes };
    }
  };

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
    const primaryCountry = countryMatch ? countryMatch[1].toLowerCase() : 'us';
    
    console.log('[API] Extracted App ID:', appId, 'Primary Country:', primaryCountry);

    // Try multiple countries if app not found in primary country
    const countriesToTry = [primaryCountry, 'us', 'vn', 'cn', 'au', 'ca'];
    const uniqueCountries = [...new Set(countriesToTry)]; // Remove duplicates
    
    let result = null;
    let lastError = null;
    let successfulCountry = null;

    for (const country of uniqueCountries) {
      try {
        console.log(`[API] Trying country: ${country}`);
        
        // Call iTunes API without entity parameter to be more flexible
        const itunesUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${country}`;
        console.log('[API] iTunes API URL:', itunesUrl);
        
        let apiResponse;
        let retryCount = 0;
        const maxRetries = 3;
        
        // Retry logic for each country
        while (retryCount < maxRetries) {
          try {
            apiResponse = await fetch(itunesUrl, {
              method: 'GET',
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json',
                'Accept-Language': 'en-US,en;q=0.9',
              },
              timeout: 10000
            });
            
            console.log(`[API] iTunes API Response status for ${country}: ${apiResponse.status}`);
            
            if (apiResponse.ok) {
              break;
            } else {
              throw new Error(`HTTP ${apiResponse.status}: ${apiResponse.statusText}`);
            }
          } catch (error) {
            retryCount++;
            console.log(`[API] Retry ${retryCount}/${maxRetries} for country ${country}. Error: ${error.message}`);
            if (retryCount >= maxRetries) {
              throw error;
            }
            // Wait 1 second before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
        
        const responseData = await apiResponse.json();
        console.log(`[API] iTunes API Response data for ${country}:`, JSON.stringify(responseData, null, 2));

        if (responseData && responseData.results && Array.isArray(responseData.results) && responseData.results.length > 0) {
          result = responseData.results[0];
          successfulCountry = country;
          console.log(`[API] App found in country: ${country}, App name: ${result.trackName}`);
          break;
        } else {
          console.log(`[API] App not found in country: ${country}`);
        }
        
      } catch (error) {
        console.error(`[API] Error trying country ${country}:`, error.message);
        lastError = error;
        continue;
      }
    }

    if (!result) {
      console.log('[API] App not found in any country');
      return res.status(404).json({
        error: 'Không tìm thấy ứng dụng với ID này trong bất kỳ khu vực nào',
        appId,
        countriesTried: uniqueCountries,
        lastError: lastError?.message
      });
    }

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
      // Add metadata about the search
      foundInCountry: successfulCountry,
      searchedCountries: uniqueCountries
    };

    // --- Prefer iPhone screenshots only ---
    // Keep original iTunes fields, but normalize screenshots:
    // 1) Drop iPad screenshots completely
    // 2) If iTunes screenshots are missing/placeholder -> fallback to Apple HTML (iPhone only)
    appInfo.ipadScreenshots = []; // admin chỉ dùng iPhone

    const itunesShots = Array.isArray(appInfo.screenshots) ? appInfo.screenshots : [];
    const hasRealItunesShot = itunesShots.some((u) => u && !isProbablyPlaceholder(u) && !isIpadShot(u) && !isAppIcon(u));

    if (!hasRealItunesShot) {
      const { screenshots: htmlShots, notes } = await fetchAppleHtmlIphoneScreenshots({
        trackViewUrl: result.trackViewUrl,
        appId: appInfo.appId,
        country: successfulCountry || 'us',
      });

      if (htmlShots.length) {
        appInfo.screenshots = htmlShots;
        appInfo.screenshots_source = 'apple_html';
      } else {
        // keep original (could be empty), but mark source for debugging
        appInfo.screenshots_source = 'itunes_api_empty';
      }

      // optional debug (won't break existing clients)
      appInfo.debug = appInfo.debug || {};
      appInfo.debug.html_notes = notes;
    } else {
      // Use iTunes screenshots, but dedupe + filter iPhone-only
      const filtered = itunesShots
        .filter((u) => u && !isProbablyPlaceholder(u) && !isIpadShot(u) && !isAppIcon(u))
        .map((u) => u.split('?')[0]);
      appInfo.screenshots = Array.from(new Set(filtered)).slice(0, 10);
      appInfo.screenshots_source = 'itunes_api';
    }


    console.log('[API] Final app info prepared for:', appInfo.name, 'found in country:', successfulCountry);
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