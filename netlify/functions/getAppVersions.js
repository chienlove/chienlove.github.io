const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const page = event.queryStringParameters.page || 1;
    const limit = event.queryStringParameters.limit || 1000; // Giới hạn số lượng mỗi lần
    
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}&page=${page}&limit=${limit}`;
    
    // Nếu không có pagination từ API gốc, chúng ta sẽ lấy theo chunks
    const MAX_CHUNKS = 3; // Số lần gọi tối đa
    
    const fetchChunk = async (url, attempt = 1) => {
        try {
            const response = await fetch(url, {
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP Error: ${response.status}`);
            }

            const text = await response.text();
            if (!text || text.trim() === '') {
                throw new Error('Empty response');
            }

            return JSON.parse(text);
        } catch (error) {
            if (attempt < 3) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                return fetchChunk(url, attempt + 1);
            }
            throw error;
        }
    };

    try {
        let allData = [];
        let hasMore = true;
        let currentChunk = 1;

        while (hasMore && currentChunk <= MAX_CHUNKS) {
            const chunkUrl = `${apiUrl}&chunk=${currentChunk}`;
            const chunkData = await fetchChunk(chunkUrl);

            if (Array.isArray(chunkData) && chunkData.length > 0) {
                allData = allData.concat(chunkData);
                
                // Nếu số lượng ít hơn limit, có thể đã hết data
                if (chunkData.length < limit) {
                    hasMore = false;
                }
            } else {
                hasMore = false;
            }

            currentChunk++;
        }

        // Sắp xếp và lọc trùng
        const uniqueData = Array.from(new Map(
            allData.map(item => [item.external_identifier, item])
        ).values());

        const sortedData = uniqueData.sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        // Thêm metadata
        const response = {
            data: sortedData,
            metadata: {
                total: sortedData.length,
                chunks: currentChunk - 1,
                hasMore: hasMore
            }
        };

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(response)
        };

    } catch (error) {
        console.error('Final error:', error);
        
        return {
            statusCode: error.message.includes('404') ? 404 : 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: "Request failed",
                error: error.message,
                appId: appId
            })
        };
    }
};