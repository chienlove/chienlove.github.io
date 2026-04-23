const axios = require('axios');

// --- CÂU LỆNH TÌM KIẾM ---
const GRAPHQL_SEARCH_QUERY = `query SearchApps($searchText: String!, $page: Int!) {
  searchApps(searchText: $searchText, page: $page) {
    content {
      id
      title
      artworkUrl
      lastActivity {
        ... on AppActivityUpdate { versionTo }
      }
    }
  }
}`;

// --- CÂU LỆNH LẤY CHI TIẾT APP ---
const GRAPHQL_DETAIL_QUERY = `query GetAppDetail($id: ID!) {
  app(id: $id) {
    id
    ITunesId
    bundleIdentifier
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
    developer { name }
    size
    ageRating
    devices
    releaseDate
    minimumOSVersion
  }
}`;

// Hàm làm nét ảnh chuẩn Apple
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
            'Origin': 'https://appraven.net'
        }
    });
    return response.data;
}

// Hàm lấy dữ liệu chuẩn
async function fetchFromAppRaven(input) {
    try {
        let internalRavenId = String(input).trim();
        
        // NẾU INPUT LÀ APPLE ID (Apple ID thường > 8 số)
        if (internalRavenId.length >= 9) {
            console.log(`[1] Đang tìm kiếm ứng dụng mang Apple ID: ${internalRavenId}...`);
            
            // Lấy thông tin cơ bản từ Apple trước để có "Tên Ứng Dụng" (Dùng Tên tìm trên AppRaven sẽ chuẩn nhất)
            let appNameForSearch = internalRavenId; // Mặc định thử tìm bằng ID luôn
            try {
                 const appleLookup = await axios.get(`https://itunes.apple.com/lookup?id=${internalRavenId}`);
                 if (appleLookup.data.resultCount > 0) {
                     appNameForSearch = appleLookup.data.results[0].trackName;
                     console.log(`- Tìm thấy tên trên App Store: ${appNameForSearch}`);
                 }
            } catch (e) {
                 console.log(`- App đã bị xóa khỏi Apple, thử tìm kiếm thẳng bằng ID.`);
            }

            // Gọi API Search của AppRaven
            const searchData = await callAppRavenGraphQL("SearchApps", { searchText: appNameForSearch, page: 0 }, GRAPHQL_SEARCH_QUERY);
            const searchResults = searchData?.data?.searchApps?.content || [];

            if (searchResults.length === 0) return null;

            // Lấy thẳng kết quả đầu tiên (Vì tìm bằng Tên chính xác, kết quả số 1 luôn đúng)
            internalRavenId = searchResults[0].id;
        }

        console.log(`[2] Gọi GetAppDetail với ID nội bộ AppRaven: ${internalRavenId}`);
        
        // GỌI API DETAIL LẤY FULL THÔNG TIN
        const detailData = await callAppRavenGraphQL("GetAppDetail", { id: internalRavenId }, GRAPHQL_DETAIL_QUERY);
        const appData = detailData?.data?.app;
        
        if (!appData) return null;

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
            source: 'AppRaven GraphQL',
            appRavenId: internalRavenId,
            appleId: appData.ITunesId ? String(appData.ITunesId) : String(input),
            appName: appData.title || 'Không rõ',
            developer: appData.developer?.name || '',
            icon: formatAppleUrl(appData.artworkUrl, true),
            version: appData.version || '',
            releaseDate: appData.releaseDate || '',
            lastUpdateDate: appData.lastUpdateDate || '',
            minimumOSVersion: appData.minimumOSVersion || '',
            sizeMB: appData.size ? (appData.size / (1024 * 1024)).toFixed(2) : '0',
            description: appData.description || '',
            ageRating: appData.ageRating || '',
            devices: appData.devices || [],
            screenshots: screenshots,
            videos: videos
        };

    } catch (error) {
        const errorMsg = error.response ? `HTTP ${error.response.status}` : error.message;
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
    if (!appId) return res.status(400).json({ success: false, message: 'Thiếu App ID' });

    try {
        const data = await fetchFromAppRaven(appId);
        if (data) {
            return res.status(200).json({ success: true, data: data });
        } else {
            return res.status(404).json({ success: false, message: 'Không tìm thấy ứng dụng trên AppRaven.' });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
