// pages/api/admin/scrape-testflight.js
import axios from 'axios';
import cheerio from 'cheerio';

export default async function handler(req, res) {
  // Xử lý CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ 
      error: 'Missing TestFlight ID parameter',
      usage: '/api/admin/scrape-testflight?id=TESTFLIGHT_ID' 
    });
  }

  try {
    const { data } = await axios.get(`https://testflight.apple.com/join/${id}`, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15'
      },
      timeout: 10000
    });

    const $ = cheerio.load(data);
    const appName = $('title').text()
      .replace(' - TestFlight - Apple', '')
      .replace('Join the ', '')
      .trim();

    let status = 'Y';
    if (data.includes('This beta is full')) status = 'F';
    if (data.includes("isn't accepting any new testers")) status = 'N';

    return res.status(200).json({
      success: true,
      id,
      appName,
      status
    });

  } catch (error) {
    console.error('Scrape Error:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        success: false,
        error: 'TestFlight not found' 
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
}