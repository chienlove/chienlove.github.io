// /pages/api/test/appstore-html.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { appid_or_url, country = "us" } = req.body || {};
    const appId = extractAppId(appid_or_url);
    if (!appId) return res.status(400).json({ error: "Không tìm thấy appid từ input" });

    // 1) iTunes Search API
    const lookupUrl = `https://itunes.apple.com/lookup?id=${appId}&country=${encodeURIComponent(country)}`;
    const itunesResp = await fetch(lookupUrl, {
      headers: { "Accept": "application/json" },
    });
    const itunesJson = await itunesResp.json().catch(() => null);

    const itunesResult = itunesJson?.results?.[0] || null;
    const trackViewUrl = itunesResult?.trackViewUrl
      || `https://apps.apple.com/${country}/app/id${appId}`;

    const screenshots_from_itunes = unique([
      ...(itunesResult?.screenshotUrls || []),
      ...(itunesResult?.ipadScreenshotUrls || []),
    ]);

    // 2) HTML apps.apple.com fallback
    const htmlInfo = await fetchAndParseAppStoreHTML(trackViewUrl);

    return res.status(200).json({
      ok: true,
      appId,
      country,
      lookupUrl,
      trackViewUrl,
      itunes: {
        found: !!itunesResult,
        trackName: itunesResult?.trackName || null,
        bundleId: itunesResult?.bundleId || null,
        version: itunesResult?.version || null,
      },
      screenshots_from_itunes,
      screenshots_from_html: htmlInfo.screenshots,
      html_parse_notes: htmlInfo.notes,
      sources: {
        screenshots: screenshots_from_itunes.length ? "itunes" : (htmlInfo.screenshots.length ? "apple_html" : "none"),
      },
    });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}

function extractAppId(input) {
  const s = String(input ?? "").trim();
  if (!s) return null;
  if (/^\d+$/.test(s)) return s;
  const m = s.match(/id(\d+)/);
  return m?.[1] || null;
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

/**
 * Parse screenshots từ HTML apps.apple.com
 * - Không cố "hack" anti-bot.
 * - Dùng 2 cách:
 *   A) bắt URL ảnh mzstatic phổ biến trong HTML
 *   B) bắt <meta property="og:image"> (icon, không phải screenshot) để debug
 */
async function fetchAndParseAppStoreHTML(trackViewUrl) {
  const notes = [];
  try {
    const r = await fetch(trackViewUrl, {
      headers: {
        // User-Agent "bình thường" để Apple trả HTML đúng layout
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    notes.push(`HTTP ${r.status} ${r.statusText}`);
    if (!r.ok) return { screenshots: [], notes };

    const html = await r.text();
    notes.push(`HTML length=${html.length}`);

    // Cách A: bắt các link ảnh screenshot phổ biến
    // (trang App Store dùng rất nhiều mzstatic; regex này cố tình "dễ sống" nhưng có thể lẫn icon)
    const re = /https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^"'<> ]+?\.(png|jpg|jpeg)/gi;
    const found = html.match(re) || [];

    // lọc thô: ưu tiên ảnh có kích thước kiểu 1242x2688 / 2688x1242 / ... trong URL (hay gặp ở screenshot)
    const likelyScreens = found.filter(u => /\/\d{3,4}x\d{3,4}/.test(u) || /bb\.png/.test(u));

    notes.push(`mzstatic_found=${found.length}`);
    notes.push(`likelyScreens=${likelyScreens.length}`);

    return { screenshots: unique(likelyScreens), notes };
  } catch (e) {
    notes.push(`error=${String(e?.message || e)}`);
    return { screenshots: [], notes };
  }
}