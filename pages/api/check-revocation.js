// pages/api/check-revocation.js
export default async function handler(req, res) {
  // Cache rất ngắn ở CDN và cho phép SWR để lần sau vào nhanh
  res.setHeader(
    'Cache-Control',
    'public, max-age=5, s-maxage=5, stale-while-revalidate=300'
  );

  async function fetchOnce(timeoutMs = 3000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch('https://ipadl.storeios.net/api/check-revocation', {
        method: 'GET',
        signal: controller.signal,
        // Quan trọng: bỏ cookies đi cho cache tốt hơn
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(t);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      clearTimeout(t);
      return null;
    }
  }

  // Thử 1: 3s; Thử 2: 5s (không bao giờ quá 8s)
  let json = await fetchOnce(3000);
  if (!json) json = await fetchOnce(5000);

  // Luôn trả JSON có cấu trúc
  res.status(200).json(
    json || {
      ocspStatus: 'error',
      checkedAt: new Date().toISOString(),
      message: 'Không lấy được trạng thái lúc này.'
    }
  );
}
