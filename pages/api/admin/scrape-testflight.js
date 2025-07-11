import axios from 'axios';
import * as cheerio from 'cheerio';
import cache from 'memory-cache'; // Add this line

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      error: 'Missing TestFlight ID parameter',
      usage: '/api/admin/scrape-testflight?id=TESTFLIGHT_ID'
    });
  }

  const cacheKey = `testflight-status-${id}`;
  const cached = cache.get(cacheKey);

  if (cached) {
    return res.status(200).json({ ...cached, cached: true }); // Add cached flag
  }

  try {
    const response = await axios.get(`https://testflight.apple.com/join/${id}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const title = $('title').text();
    const appName = title
      .replace(' - TestFlight - Apple', '')
      .replace('Join the ', '')
      .trim();

    let status = 'Y';
    if (response.data.includes('This beta is full')) status = 'F';
    if (response.data.includes("isn't accepting any new testers")) status = 'N';

    const result = {
      success: true,
      id,
      appName,
      status,
      htmlLength: response.data.length
    };

    cache.put(cacheKey, result, 30 * 1000); // Cache 30 giây

    return res.status(200).json({ ...result, cached: false });

  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
}