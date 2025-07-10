import cheerio from "cheerio";
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("https://testflight.apple.com/join/")) {
    return res.status(400).json({ error: "URL TestFlight không hợp lệ" });
  }

  try {
    const tfRes = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!tfRes.ok) throw new Error("Không thể truy cập trang TestFlight");

    const html = await tfRes.text();
    const $ = cheerio.load(html);

    const name = $("h1").first().text().trim();
    const author = $("h2").first().text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const icon = $('meta[property="og:image"]').attr("content") || "";
    const link = $('meta[property="og:url"]').attr("content") || url;

    // 🔍 Tìm link App Store trong mô tả (nếu có)
    const appStoreMatch = description.match(/https:\/\/apps\.apple\.com\/[^\s]+/);
    let appStoreUrl = appStoreMatch ? appStoreMatch[0].split('?')[0] : null;

    let version = "", released = "", size = "", screenshots = [], category = "";

    if (appStoreUrl) {
      const appRes = await fetch(appStoreUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const appHtml = await appRes.text();
      const $$ = cheerio.load(appHtml);

      version = $$('p.l-column.small-6.medium-12.whats-new__latest__version').text().trim();
      released = $$('time').first().attr('datetime') || "";
      size = $$('li:contains("Size")').text().replace('Size', '').trim();
      category = $$('li:contains("Category")').text().replace('Category', '').trim();

      $$('picture.product-hero__screenshot source').each((i, el) => {
        const srcset = $$(el).attr('srcset');
        if (srcset) {
          const img = srcset.split(' ')[0]; // Lấy ảnh đầu tiên trong srcset
          screenshots.push(img);
        }
      });
    }

    return res.status(200).json({
      name,
      author,
      description,
      icon,
      link,
      version,
      size,
      released,
      category,
      screenshots,
      appStoreUrl: appStoreUrl || null,
      source: url
    });
  } catch (error) {
    console.error("Scraping error:", error);
    return res.status(500).json({ error: "Lỗi khi scraping dữ liệu" });
  }
}