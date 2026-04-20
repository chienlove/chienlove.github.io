const axios = require('axios');

// --- 1. CÂU LỆNH TÌM KIẾM APP ---
const GRAPHQL_SEARCH_QUERY = `query SearchApps($searchText: String!) {
  apps(query: $searchText, page: 0) {
    content {
      id
      ITunesId
      title
    }
  }
}`;

// --- 2. CÂU LỆNH LẤY CHI TIẾT APP ---
const GRAPHQL_DETAIL_QUERY = `query GetAppDetail($id: ID!) {
  app(id: $id) {
    id
    ITunesId
    title
    artworkUrl
    assets {
      id
      type
      url
      device
    }
    priceTier
    rating
    ratingCount
    version
    lastUpdateDate
    subtitle
    releaseNotes
    description
    developer {
      name
    }
    size
    ageRating
    releaseDate
    minimumOSVersion
  }
}`;

// Hàm làm nét ảnh 
function formatAppleUrl(rawUrl, isIcon = false) {
    if (!rawUrl) return null;
    const replacement = isIcon ? '1024x1024bb.png' : '1920x1920bb.jpg';
    return rawUrl.replace('{w}x{h}{c}.{f}', replacement);
}

// Hàm gọi GraphQL dùng chung
async function callAppRavenGraphQL(operationName, variables, query) {
    const payload = { operationName, variables, query };
    const response = await axios.post('https://appraven.net/appraven/graphql', payload, {
        headers: { 
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
            'Origin': 'https://appraven.net',
            'Referer': 'https://appraven.net/'
        }
    });
    return response.data;
}

// Logic chính
async function fetchFromAppRaven(appleIdOrKeyword) {
    try {
        console.log(`[1] Đang tìm kiếm App bằng Apple ID: ${appleIdOrKeyword}...`);
        
        // BƯỚC 1: Gọi API Search để lấy ID nội bộ
        const searchData = await callAppRavenGraphQL("SearchApps", { searchText: String(appleIdOrKeyword) }, GRAPHQL_SEARCH_QUERY);
        const searchResults = searchData?.data?.apps?.content || [];

        if (searchResults.length === 0) {
            return null; // Không tìm thấy app nào khớp với ID này
        }

        // Lấy app đầu tiên trong kết quả tìm kiếm (Vì tìm bằng ID nên kết quả đầu tiên chắc chắn là nó)
        const internalRavenId = searchResults[0].id;
        console.log(`✅ Tìm thấy ID nội bộ AppRaven: ${internalRavenId}`);
        console.log(`[2] Đang tải chi tiết dữ liệu...`);

        // BƯỚC 2: Gọi API Detail để lấy full thông tin
        const detailData = await callAppRavenGraphQL("GetAppDetail", { id: internalRavenId }, GRAPHQL_DETAIL_QUERY);
        const appData = detailData?.data?.app;
        
        if (!appData) return null;

        // BƯỚC 3: Phân loại Screenshots và Videos
        const screenshots = [];
        const videos = [];

        if (Array.isArray(appData.assets)) {
            appData.assets.forEach(asset => {
                if (asset.type === 'SCREENSHOT') {
                    screenshots.push(formatAppleUrl(asset.url, false));
                } else if (asset.type === 'VIDEO') {
                    videos.push(asset.url);
                }
            });
        }

        return {
            source: 'AppRaven GraphQL Native',
            appRavenId: internalRavenId,
            appleId: appData.ITunesId ? String(appData.ITunesId) : appleIdOrKeyword,
            appName: appData.title || 'Không rõ',
            developer: appData.developer?.name || '',
            icon: formatAppleUrl(appData.artworkUrl, true),
            version: appData.version || '',
            releaseDate: appData.releaseDate || '',
            lastUpdateDate: appData.lastUpdateDate || '',
            minimumOSVersion: appData.minimumOSVersion || '',
            sizeMB: appData.size ? (appData.size / (1024 * 1024)).toFixed(2) : '0',
            description: appData.description || '',
            screenshots: screenshots,
            videos: videos
        };

    } catch (error) {
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
        console.error('❌ Lỗi API:', errorMsg);
        throw new Error(`Lỗi kết nối AppRaven: ${errorMsg}`);
    }
}

// --- HANDLER NEXT.JS ---
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Chỉ hỗ trợ GET' });

    const appId = req.query.id;
    if (!appId) {
        return res.status(400).json({ success: false, message: 'Thiếu tham số App ID' });
    }

    try {
        const data = await fetchFromAppRaven(appId);

        if (data) {
            return res.status(200).json({
                success: true,
                data: data
            });
        } else {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy ứng dụng này trên kho AppRaven.'
            });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
