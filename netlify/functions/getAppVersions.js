const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    const appId = event.queryStringParameters.id;
    const page = event.queryStringParameters.page || 1;
    const limit = event.queryStringParameters.limit || 1000;
    
    // Validate appId
    if (!appId || !/^\d+$/.test(appId)) {
        return {
            statusCode: 400,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                message: "Invalid app ID",
                error: "App ID must be numeric",
                appId: appId
            })
        };
    }

    try {
        const result = await tryPrimaryApi(appId, page, limit);
        return result;
    } catch (primaryError) {
        console.log('Primary API failed:', primaryError.message);
        try {
            const result = await tryFallbackApi(appId, page, limit);
            return result;
        } catch (fallbackError) {
            console.error('Both APIs failed:', fallbackError);
            return createErrorResponse(fallbackError, appId);
        }
    }
};

async function tryPrimaryApi(appId, page, limit) {
    const apiUrl = `https://api.timbrd.com/apple/app-version/index.php?id=${appId}&page=${page}&limit=${limit}`;
    const MAX_CHUNKS = 3;
    
    let allData = [];
    let hasMore = true;
    let currentChunk = 1;

    while (hasMore && currentChunk <= MAX_CHUNKS) {
        const chunkUrl = `${apiUrl}&chunk=${currentChunk}`;
        const chunkData = await fetchWithRetry(chunkUrl);

        if (Array.isArray(chunkData) && chunkData.length > 0) {
            allData = allData.concat(chunkData);
            if (chunkData.length < limit) {
                hasMore = false;
            }
        } else {
            hasMore = false;
        }

        currentChunk++;
    }

    if (allData.length === 0) {
        throw new Error('No data found in primary API');
    }

    return createSuccessResponse(allData, currentChunk - 1, hasMore);
}

async function tryFallbackApi(appId, page, limit) {
    const fallbackUrl = `https://storeios.net/api/getAppVersions?id=${appId}&page=${page}&limit=${limit}`;
    const data = await fetchWithRetry(fallbackUrl);
    
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('No data found in fallback API');
    }

    return createSuccessResponse(data, 1, false);
}

async function fetchWithRetry(url, attempt = 1) {
    const MAX_RETRIES = 3;
    const TIMEOUT = 30000;

    try {
        const response = await fetch(url, {
            timeout: TIMEOUT,
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

        try {
            return JSON.parse(text);
        } catch (parseError) {
            if (text.includes('sodar')) {
                throw new Error('SODAR_REDIRECT');
            }
            throw parseError;
        }

    } catch (error) {
        if (attempt < MAX_RETRIES && 
            !error.message.includes('SODAR_REDIRECT')) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchWithRetry(url, attempt + 1);
        }
        throw error;
    }
}

function createSuccessResponse(data, chunks, hasMore) {
    const uniqueData = Array.from(new Map(
        data.map(item => [item.external_identifier, item])
    ).values());

    const sortedData = uniqueData.sort(
        (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            data: sortedData,
            metadata: {
                total: sortedData.length,
                chunks: chunks,
                hasMore: hasMore
            }
        })
    };
}

function createErrorResponse(error, appId) {
    const statusCode = error.message.includes('404') ? 404 : 
                      error.message.includes('SODAR_REDIRECT') ? 403 : 500;
                      
    return {
        statusCode: statusCode,
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