import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith('https://testflight.apple.com/join/')) {
    return res.status(400).json({ error: 'URL TestFlight không hợp lệ' });
  }

  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
    };

    const tfRes = await fetch(url, { headers });
    if (!tfRes.ok) throw new Error(`Không thể truy cập TestFlight (${tfRes.status})`);

    const html = await tfRes.text();
    const $ = cheerio.load(html);

    const name = $('h1').first().text().trim();
    const author = $('h2').first().text().trim();
    const description = $('meta[name="description"]').attr('content') || '';
    const icon = $('meta[property="og:image"]').attr('content') || '';
    const link = $('meta[property="og:url"]').attr('content') || url;

    return res.status(200).json({
      name,
      author,
      description,
      icon,
      link,
      version: null,
      size: null,
      released: null,
      category: null,
      screenshots: [],
      appStoreUrl: null,
      source: url
    });
  } catch (error) {
    console.error("🔥 Scraping error:", error);
    return res.status(500).json({
      error: "Lỗi khi scraping dữ liệu",
      detail: error.message || String(error)
    });
  }
}