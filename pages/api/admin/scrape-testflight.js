import cheerio from "cheerio";
import fetch from "node-fetch";

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("https://testflight.apple.com/join/")) {
    return res.status(400).json({ error: "URL TestFlight không hợp lệ" });
  }

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.110 Safari/537.36'
  };

  try {
    const tfRes = await fetch(url, { headers });
    if (!tfRes.ok) throw new Error(`Không thể truy cập TestFlight (${tfRes.status})`);

    const html = await tfRes.text();
    const $ = cheerio.load(html);

    const name = $("h1").first().text().trim();
    const author = $("h2").first().text().trim();
    const description = $('meta[name="description"]').attr("content") || "";
    const icon = $('meta[property="og:image"]').attr("content") || "";
    const link = $('meta[property="og:url"]').attr("content") || url;

    const appStoreMatch = description.match(/https:\/\/apps\.apple\.com\/[^\s"']+/);
    let appStoreUrl = appStoreMatch ? appStoreMatch[0].split('?')[0] : null;

    let version = "", released = "", size = "", screenshots = [], category = "";

    if (appStoreUrl) {
      try {
        const appRes = await fetch(appStoreUrl, { headers });
        if (!appRes.ok) throw new Error(`Không thể truy cập App Store (${appRes.status})`);

        const appHtml = await appRes.text();
        const $$ = cheerio.load(appHtml);

        version = $$('p.l-column.small-6.medium-12.whats-new__latest__version').text().trim();
        released = $$('time').first().attr('datetime') || "";
        size = $$('li:contains("Size")').text().replace('Size', '').trim();
        category = $$('li:contains("Category")').text().replace('Category', '').trim();

        $$('picture.product-hero__screenshot source').each((i, el) => {
          const srcset = $$(el).attr('srcset');
          if (srcset) {
            const img = srcset.split(' ')[0];
            if (img.startsWith('https://')) screenshots.push(img);
          }
        });
      } catch (appError) {
        console.error("Lỗi khi fetch App Store:", appError);
      }
    } else {
      console.warn("⚠️ Không tìm thấy link App Store trong TestFlight mô tả.");
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
      appStoreUrl,
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