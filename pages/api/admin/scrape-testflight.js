import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const { appId } = req.query;

  if (!appId) {
    return res.status(400).json({ error: 'appId is required' });
  }

  try {
    const url = `https://testflight.apple.com/join/${appId}`;
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    const appInfo = {
      name: $('.app-name')?.text()?.trim() || 'N/A',
      description: $('.description')?.text()?.trim() || 'N/A',
      developer: $('.developer')?.text()?.trim() || 'N/A',
      status: $('.status')?.text()?.trim() || 'N/A',
      icon: $('.app-icon img')?.attr('src') || 'N/A'
    };

    if (appInfo.name === 'N/A' && appInfo.description === 'N/A') {
      return res.status(404).json({ error: 'App not found or invalid appId' });
    }

    res.status(200).json({
      success: true,
      data: appInfo
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch app information',
      details: error.message
    });
  }
}