const axios = require('axios');

// Cục Query GraphQL siêu to khổng lồ mà bạn vừa lấy được
const GRAPHQL_QUERY_STRING = `query GetAppDetail($id: ID!) {
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

// Hàm tiện ích biến đổi link ảnh gốc của Apple thành chất lượng cao
function formatAppleUrl(rawUrl, isIcon = false) {
    if (!rawUrl) return null;
    // Icon thường dùng đuôi png, ảnh màn hình dùng jpg. 'bb' là mã giữ nguyên tỉ lệ ảnh (bounding box)
    const replacement = isIcon ? '1024x1024bb.png' : '1920x1920bb.jpg';
    return rawUrl.replace('{w}x{h}{c}.{f}', replacement);
}

async function fetchFromAppRaven(appleIdOrKeyword) {
    try {
        console.log(`[1] Đang tìm ID nội bộ của AppRaven...`);
        
        // 1. Tìm ID nội bộ thông qua DuckDuckGo
        const searchUrl = `https://html.duckduckgo.com/html/?q=site:appraven.net/app/+${encodeURIComponent(appleIdOrKeyword)}`;
        const ddgResponse = await axios.get(searchUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        // Trích xuất ID nội bộ (ví dụ: lấy số 6083004 từ link appraven.net/app/6083004)
        const linkMatch = ddgResponse.data.match(/appraven\.net\/app\/(\d+)/i);
        
        if (!linkMatch) {
            return null; // Không tìm thấy trên hệ thống
        }

        const internalRavenId = linkMatch[1];
        console.log(`✅ Tìm thấy ID nội bộ AppRaven: ${internalRavenId}`);
        console.log(`[2] Đang gọi GraphQL API...`);

        // 2. Gửi Request GraphQL để lấy data xịn
        const graphqlPayload = {
            operationName: "GetAppDetail",
            variables: { id: internalRavenId },
            query: GRAPHQL_QUERY_STRING
        };

        const detailResponse = await axios.post('https://appraven.net/appraven/graphql', graphqlPayload, {
            headers: { 
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1',
                'Origin': 'https://appraven.net',
                'Referer': `https://appraven.net/app/${internalRavenId}`
            }
        });

        const appData = detailResponse.data?.data?.app;
        
        if (!appData) return null;

        // 3. Phân loại và làm đẹp dữ liệu trả về
        const screenshots = [];
        const videos = [];

        if (Array.isArray(appData.assets)) {
            appData.assets.forEach(asset => {
                if (asset.type === 'SCREENSHOT') {
                    screenshots.push(formatAppleUrl(asset.url, false));
                } else if (asset.type === 'VIDEO') {
                    videos.push(asset.url); // Giữ nguyên link .m3u8 của video
                }
            });
        }

        return {
            source: 'AppRaven GraphQL',
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
        console.error('❌ Lỗi:', errorMsg);
        throw new Error(`Lỗi gọi GraphQL: ${errorMsg}`);
    }
}

// --- HANDLER CHUẨN CỦA NEXT.JS ---
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
                message: 'Không tìm thấy. AppRaven có thể có, nhưng bọ tìm kiếm chưa kịp Index ID này.'
            });
        }
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
}
