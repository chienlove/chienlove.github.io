export default function handler(req, res) {
  console.log("🧪 Test API called with method:", req.method);
  if (req.method !== 'POST') return res.status(405).json({ message: 'Wrong method' });

  return res.status(200).json({ message: 'API test ok' });
}