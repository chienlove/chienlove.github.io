const axios = require('axios');

// --- CÂU LỆNH TÌM KIẾM ---
const GRAPHQL_SEARCH_QUERY = `query SearchApps($searchText: String!, $page: Int!) {
  searchApps(searchText: $searchText, page: $page) {
    content { id title artworkUrl }
  }
}`;

// --- CÂU LỆNH LẤY CHI TIẾT (Dùng chung cho cả App và Game) ---
const getDetailQuery = (type) => `query GetDetail($id: ID!) {
  ${type}(id: $id) {
    id
    ITunesId
    bundleIdentifier
    title
    artworkUrl
    assets { id type url device }
    priceTier
    rating
    ratingCount
    version
    lastUpdateDate
    subtitle
    releaseNotes
    description
    developer { name }
    size
    ageRating
    devices
    releaseDate
    minimumOSVersion
  }
}`;

function formatAppleUrl(rawUrl, isIcon = false) {
    if (!rawUrl) return null;
    const replacement = isIcon ? '1024x1024bb.png' : '1920x1920bb.jpg';
    return rawUrl.replace('{w}x{h}{c}.{f}', replacement);
}

async function callAppRaven(operationName, variables, query) {
    const response = await axios.post('https://appraven.net/appraven/graphql', 
    { operationName, variables, query }, 
    {
        headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
            'Origin': 'https://appraven.net'
        }
    });
    return response.data;
}

async function fetchFromAppRaven(input) {
    try {
        let internalId = String(input).trim();
        
        // 1. Nếu là Apple ID, tìm ID nội bộ trước
        if (internalId.length >= 9) {
            let searchKeyword = internalId;
            try {
                 const apple = await axios.get(`https://itunes.apple.com/lookup?id=${internalId}`);
                 if (apple.data.resultCount > 0) searchKeyword = apple.data.results[0].trackName;
            } catch (e) {}

            const searchRes = await callAppRaven("SearchApps", { searchText: searchKeyword, page: 0 }, GRAPHQL_SEARCH_QUERY);
            const results = searchRes?.data?.searchApps?.content || [];
            if (results.length === 0) return null;
            internalId = results[0].id;
        }

        // 2. Thử lấy dữ liệu từ mục 'app'
        let detailRes = await callAppRaven("GetDetail", { id: internalId }, getDetailQuery('app'));
        let data = detailRes?.data?.app;

        // 3. Nếu 'app' không có, thử lấy từ mục 'game' (Đây là chỗ then chốt)
        if (!data) {
            console.log("Không tìm thấy trong App, thử tìm trong mục Game...");
            detailRes = await callAppRaven("GetDetail", { id: internalId }, getDetailQuery('game'));
            data = detailRes?.data?.game;
        }

        if (!data) return null;

        const screenshots = [];
        const videos = [];
        if (Array.isArray(data.assets)) {
            data.assets.forEach(asset => {
                if (asset.type === 'SCREENSHOT') screenshots.push(formatAppleUrl(asset.url, false));
                else if (asset.type === 'VIDEO') videos.push(asset.url);
            });
        }

        return {
            success: true,
            appRavenId: internalId,
            appleId: data.ITunesId ? String(data.ITunesId) : String(input),
            bundleId: data.bundleIdentifier || '',
            appName: data.title || 'Không rõ',
            developer: data.developer?.name || '',
            icon: formatAppleUrl(data.artworkUrl, true),
            version: data.version || '',
            releaseDate: data.releaseDate || '',
            lastUpdateDate: data.lastUpdateDate || '',
            minimumOSVersion: data.minimumOSVersion || '',
            sizeMB: data.size ? (data.size / (1024 * 1024)).toFixed(2) : '0',
            description: data.description || '',
            ageRating: data.ageRating || '',
            devices: data.devices || [],
            screenshots,
            videos
        };
    } catch (error) {
        throw new Error(`Lỗi kết nối AppRaven: ${error.message}`);
    }
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    const appId = req.query.id;
    if (!appId) return res.status(400).json({ success: false, message: 'Thiếu ID' });

    try {
        const result = await fetchFromAppRaven(appId);
        if (result) return res.status(200).json(result);
        return res.status(404).json({ success: false, message: 'Không tìm thấy trên AppRaven.' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
