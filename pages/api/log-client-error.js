// pages/api/log-client-error.js
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { url, userAgent, error, stack } = req.body || {};

  console.error('🔥 Client Error:', {
    url,
    userAgent,
    error,
    stack,
  });

  res.status(200).json({ ok: true });
}