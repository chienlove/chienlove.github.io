// /pages/api/test/appstore-html-v2.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const {
      appid_or_url,
      countries = ["us", "vn", "hk", "jp", "sg", "th"],
      prefer = "iphone", // "iphone" | "ipad"
      html_fallback = true,
    } = req.body || {};

    const appId = extractAppId(appid_or_url);
    if (!appId) return res.status(400).json({ error: "Không tìm thấy appid từ input" });

    const itunes = await lookupBestItunesResult(appId, countries, prefer);

    const trackViewUrl =
      itunes.best?.trackViewUrl ||
      `https://apps.apple.com/${itunes.bestCountry || uniq(countries)[0] || "us"}/app/id${appId}`;

    const shotsFromItunes = buildScreenshotsFromItunes(itunes.best, prefer);

    let html = { ok: false, screenshots: [], notes: [], base_urls: [], expanded_urls: [] };
    if (html_fallback && shotsFromItunes.length === 0) {
      html = await fetchAndParseAppStoreHTMLv2(trackViewUrl, prefer);
    }

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
        html_base_urls: html.base_urls,
        html_expanded_urls: html.expanded_urls,
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

  return uniq(merged.map(normalizeAppleImageUrl)).filter(Boolean);
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
 * ✅ HTML parser v2 (lọc sạch):
 * - chỉ giữ screenshot thực (ưu tiên Simulator_Screenshot)
 * - bỏ Features*, AppIcon, Placeholder
 * - mỗi base screenshot chọn 1 size tốt nhất (không nhân 12)
 * - dedup theo base key
 */
async function fetchAndParseAppStoreHTMLv2(trackViewUrl, prefer) {
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
    if (!r.ok) return { ok: false, screenshots: [], notes, base_urls: [], expanded_urls: [] };

    const html = await r.text();
    notes.push(`htmlLength=${html.length}`);

    const jsonUrls = extractAppleImageUrlsFromEmbeddedJson(html);
    const htmlUrls = extractAppleImageUrlsFromText(html);

    notes.push(`urlsFromJson=${jsonUrls.length}`);
    notes.push(`urlsFromHtml=${htmlUrls.length}`);

    const all = uniq([...jsonUrls, ...htmlUrls])
      .map(normalizeAppleImageUrl)
      .filter(Boolean)
      .filter(u => !/Placeholder\.mill/i.test(u))
      .filter(u => !/\/image\/thumb\/Features/i.test(u))   // bỏ Features*
      .filter(u => !/\/image\/thumb\/Purple.*\/AppIcon/i.test(u)); // bỏ AppIcon

    // ✅ chỉ lấy screenshot thực
    const onlyScreens = all.filter(u => /Simulator_Screenshot/i.test(u));

    // base urls (không có /WxHbb...)
    const base = uniq(onlyScreens.map(stripSizeSuffix));

    // chọn 1 size tốt nhất / base
    const chosen = [];
    const expanded = [];
    for (const b of base) {
      const u = chooseBestSizeForBase(b, prefer);
      if (u) {
        chosen.push(u);
        expanded.push(u);
      }
    }

    notes.push(`baseScreenshotUrls=${base.length}`);
    notes.push(`finalScreenshots=${chosen.length}`);

    return {
      ok: true,
      screenshots: uniq(chosen),
      notes,
      base_urls: base,
      expanded_urls: expanded,
    };
  } catch (e) {
    notes.push(`error=${String(e?.message || e)}`);
    return { ok: false, screenshots: [], notes, base_urls: [], expanded_urls: [] };
  }
}

function extractAppleImageUrlsFromText(text) {
  const re =
    /(https:\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)|\/\/is\d-ssl\.mzstatic\.com\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp)|\/image\/thumb\/[^\s"'<>]+?\.(png|jpg|jpeg|webp))/gi;
  return uniq(text.match(re) || []);
}

function extractAppleImageUrlsFromEmbeddedJson(html) {
  const scripts = [];
  const re = /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) scripts.push(m[1]);

  const urls = [];
  for (const s of scripts) urls.push(...extractAppleImageUrlsFromText(s));
  return uniq(urls);
}

function normalizeAppleImageUrl(u) {
  if (!u) return u;
  if (u.startsWith("//is")) return "https:" + u;
  if (u.startsWith("/image/thumb/")) return "https://apps.apple.com" + u;
  return u;
}

// bỏ phần /<w>x<h>bb.<ext> nếu đã có
function stripSizeSuffix(u) {
  const s = String(u || "");
  return s.replace(/\/\d{3,4}x\d{3,4}bb\.(png|jpg|jpeg|webp)(\?.*)?$/i, "");
}

// chọn 1 size "đẹp nhất" theo prefer
function chooseBestSizeForBase(baseUrl, prefer) {
  const clean = String(baseUrl).split("?")[0];
  const m = clean.match(/\.(png|jpg|jpeg|webp)$/i);
  const ext = (m?.[1] || "png").toLowerCase();

  const iphoneSizes = ["1242x2688", "1170x2532", "1284x2778", "1290x2796", "1179x2556", "1125x2436", "828x1792"];
  const ipadSizes = ["2048x2732", "1668x2388", "1668x2224", "1536x2048"];

  const order = prefer === "ipad"
    ? [...ipadSizes, ...iphoneSizes]
    : [...iphoneSizes, ...ipadSizes];

  // ✅ chỉ trả 1 URL size đầu tiên trong thứ tự ưu tiên
  return `${clean}/${order[0]}bb.${ext}`;
}