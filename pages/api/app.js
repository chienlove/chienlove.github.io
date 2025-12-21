// /pages/api/test/appstore-html-v2.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      appid_or_url,
      countries = ["us", "vn", "hk", "jp", "sg", "th"],
      prefer = "iphone", // ưu tiên iPhone
      html_fallback = true,
    } = req.body || {};

    const appId = extractAppId(appid_or_url);
    if (!appId) return res.status(400).json({ error: "Không tìm thấy appid từ input" });

    // 1) iTunes lookup multi-country -> chọn "best" theo điểm
    const itunes = await lookupBestItunesResult(appId, countries, prefer);

    // trackViewUrl: dùng từ iTunes nếu có, fallback build từ country best hoặc first country
    const trackViewUrl =
      itunes.best?.trackViewUrl ||
      `https://apps.apple.com/${itunes.bestCountry || uniq(countries)[0] || "us"}/app/id${appId}`;

    // 2) Build screenshots theo thứ tự ưu tiên (iPhone trước)
    const shotsFromItunes = buildScreenshotsFromItunes(itunes.best, prefer);

    // 3) HTML fallback (parse JSON nhúng + bắt mzstatic trong JSON/HTML)
    let html = { ok: false, screenshots: [], notes: [] };
    if (html_fallback && shotsFromItunes.length === 0) {
      html = await fetchAndParseAppStoreHTMLv2(trackViewUrl);
    }

    // 4) chọn nguồn screenshots
    const screenshots =
      shotsFromItunes.length > 0 ? shotsFromItunes : (html.screenshots || []);

    return res.status(200).json({
      ok: true,
      appId,
      prefer,
      countries_tried: itunes.countriesTried,
      itunes_best_country: itunes.bestCountry || null,
      itunes_best_score: itunes.bestScore ?? null,
      itunes: {
        found: !!itunes.best,
        trackName: itunes.best?.trackName || null,
        bundleId: itunes.best?.bundleId || null,
        version: itunes.best?.version || null,
        sellerName: itunes.best?.sellerName || null,
        price: itunes.best?.price ?? null,
        currency: itunes.best?.currency || null,
        primaryGenreName: itunes.best?.primaryGenreName || null,
        releaseDate: itunes.best?.releaseDate || null,
      },
      trackViewUrl,
      screenshots_source:
        shotsFromItunes.length > 0 ? "itunes" : (html.screenshots?.length ? "apple_html" : "none"),
      screenshots,
      debug: {
        itunes_shots: shotsFromItunes,
        html_notes: html.notes,
        html_shots: html.screenshots,
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

function uniq(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function buildScreenshotsFromItunes(r, prefer) {
  if (!r) return [];
  const iphone = r.screenshotUrls || [];
  const ipad = r.ipadScreenshotUrls || [];
  const appletv = r.appletvScreenshotUrls || [];

  let merged;
  if (prefer === "iphone") merged = [...iphone, ...ipad, ...appletv];
  else if (prefer === "ipad") merged = [...ipad, ...iphone, ...appletv];
  else merged = [...iphone, ...ipad, ...appletv];

  // Chỉ giữ URL ảnh "đúng chuẩn" có kích thước ở cuối
  return uniq(merged.map(normalizeAppleImageUrl)).filter(isSizedAppleImageUrl);
}

function scoreItunesResult(r, prefer) {
  if (!r) return -1;
  const iphoneN = (r.screenshotUrls || []).length;
  const ipadN = (r.ipadScreenshotUrls || []).length;
  const icon = r.artworkUrl512 || r.artworkUrl100;
  let s = 0;

  if (r.trackName) s += 5;
  if (r.bundleId) s += 2;
  if (r.description) s += 2;
  if (icon) s += 3;

  // ưu tiên iPhone
  if (prefer === "iphone") {
    if (iphoneN > 0) s += 20;
    if (ipadN > 0) s += 5;
  } else {
    if (ipadN > 0) s += 20;
    if (iphoneN > 0) s += 5;
  }

  if (r.trackViewUrl) s += 1;
  return s;
}

async function lookupBestItunesResult(appId, countries, prefer) {
  const list = uniq(Array.isArray(countries) ? countries : ["us"]);
  let best = null;
  let bestScore = -1;
  let bestCountry = null;
  const countriesTried = [];

  for (const c of list) {
    countriesTried.push(c);
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(c)}`;

    let j = null;
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      j = await r.json().catch(() => null);
    } catch {
      j = null;
    }

    const r0 = j?.results?.[0] || null;
    if (!r0) continue;

    const sc = scoreItunesResult(r0, prefer);
    if (sc > bestScore) {
      bestScore = sc;
      best = r0;
      bestCountry = c;
    }
  }

  return { best, bestScore, bestCountry, countriesTried };
}

/**
 * HTML parser v2:
 * - fetch apps.apple.com
 * - lấy tất cả <script type="application/json">...</script> và tìm URL ảnh trong JSON
 * - fallback: tìm URL ảnh trực tiếp trong HTML
 * - CHỈ GIỮ URL có /<w>x<h>bb.<ext> ở cuối (đúng chuẩn ảnh)
 */
async function fetchAndParseAppStoreHTMLv2(trackViewUrl) {
  const notes = [];
  try {
    const r = await fetch(trackViewUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    notes.push(`HTTP ${r.status} ${r.statusText}`);
    notes.push(`finalUrl=${r.url}`);

    if (!r.ok) return { ok: false, screenshots: [], notes };

    const html = await r.text();
    notes.push(`htmlLength=${html.length}`);

    // A) URLs từ JSON nhúng
    const jsonUrls = extractAppleImageUrlsFromEmbeddedJson(html);
    notes.push(`urlsFromJson=${jsonUrls.length}`);

    // B) URLs trực tiếp trong HTML
    const htmlUrls = extractAppleImageUrlsFromText(html);
    notes.push(`urlsFromHtml=${htmlUrls.length}`);

    const all = uniq([...jsonUrls, ...htmlUrls])
      .map(normalizeAppleImageUrl)
      .filter(isSizedAppleImageUrl);

    notes.push(`sizedUrls=${all.length}`);

    return { ok: true, screenshots: all, notes };
  } catch (e) {
    notes.push(`error=${String(e?.message || e)}`);
    return { ok: false, screenshots: [], notes };
  }
}

/**
 * Bắt 3 dạng URL:
 * 1) https://is1-ssl.mzstatic.com/image/thumb/.../1242x2688bb.png
 * 2) //is1-ssl.mzstatic.com/image/thumb/.../1242x2688bb.png
 * 3) /image/thumb/.../1242x2688bb.png   (relative trên apps.apple.com)
 */
function extractAppleImageUrlsFromText(text) {
  const re =
    /(https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)|\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)|\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp))/gi;
  return uniq(text.match(re) || []);
}

function extractAppleImageUrlsFromEmbeddedJson(html) {
  const scripts = [];
  const re = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    scripts.push(m[1]);
  }

  const urls = [];
  for (const s of scripts) {
    urls.push(...extractAppleImageUrlsFromText(s));
  }
  return uniq(urls);
}

function normalizeAppleImageUrl(u) {
  if (!u) return u;
  if (u.startsWith("//is")) return "https:" + u;
  if (u.startsWith("/image/thumb/")) return "https://apps.apple.com" + u;
  return u;
}

// Chỉ giữ link ảnh đúng chuẩn có kích thước ở cuối
function isSizedAppleImageUrl(u) {
  return /\/\d{3,4}x\d{3,4}bb\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(String(u || ""));
}