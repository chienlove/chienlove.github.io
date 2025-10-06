// pages/api/check-revocation.js
export default async function handler(req, res) {
  // Cache CDN 60s + SWR 5 phút để nhanh hơn
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  // Server-side có thể abort an toàn (DOM sẽ không log lỗi)
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 5000);

  try {
    const r = await fetch('https://ipadl.storeios.net/api/check-revocation', {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(t);
    if (!r.ok) {
      return res.status(200).json({ ocspStatus: 'error' });
    }
    const json = await r.json();
    return res.status(200).json(json);
  } catch {
    clearTimeout(t);
    return res.status(200).json({ ocspStatus: 'error' });
  }
}