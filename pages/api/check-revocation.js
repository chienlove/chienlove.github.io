// pages/api/check-revocation.js
export default async function handler(req, res) {
  // Giữ cache để vào trang nhanh hơn
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

  async function fetchOnce(ms = 3000) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), ms);
    try {
      const r = await fetch('https://ipadl.storeios.net/api/check-revocation', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!r.ok) return null;
      return await r.json();
    } catch {
      clearTimeout(t);
      return null;
    }
  }

  // Thử 1: 3s, Thử 2 (nếu cần): 5s
  let json = await fetchOnce(3000);
  if (!json) json = await fetchOnce(5000);

  res.status(200).json(json || { ocspStatus: 'error' });
}