import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const appId = req.query.appId || req.query.appid;
  
  if (!appId) {
    return res.status(400).json({ error: 'appId is required' });
  }

  if (!/^[a-zA-Z0-9]{8}$/.test(appId)) {
    return res.status(400).json({ error: 'Invalid appId format' });
  }

  try {
    const url = `https://testflight.apple.com/join/${appId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 5000
    });

    if (!response.data || typeof response.data !== 'string') {
      throw new Error('Invalid HTML response from TestFlight');
    }

    const $ = cheerio.load(response.data);

    // Cập nhật selector dựa trên HTML thực tế
    const appInfo = {
      name: $('.app-title')?.text()?.trim() || 'N/A', // Thay .app-name bằng selector thực
      description: $('.app-description')?.text()?.trim() || 'N/A', // Thay .description
      developer: $('.developer-name')?.text()?.trim() || 'N/A', // Thay .developer
      status: $('.status-text')?.text()?.trim() || 'N/A', // Thay .status
      icon: $('.app-icon img')?.attr('src') || 'N/A'
    };

    // Log HTML để debug
    console.log('Extracted appInfo:', appInfo);

    if (appInfo.name === 'N/A' && appInfo.description === 'N/A') {
      return res.status(404).json({ error: 'App not found or invalid appId' });
    }

    res.status(200).json({
      success: true,
      data: appInfo
    });
  } catch (error) {
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response ? { status: error.response.status, data: error.response.data } : null
    });
    res.status(500).json({
      error: 'Failed to fetch app information',
      details: error.message
    });
  }
}