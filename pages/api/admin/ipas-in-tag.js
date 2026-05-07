// pages/api/admin/ipas-in-tag.js
export default async function handler(req, res) {
  const { tag } = req.query;

  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  if (!tag) return res.status(400).json({ message: "Thiếu tag" });

  const GITHUB_REPO = "chienlove/chienlove.github.io";
  const GITHUB_TOKEN = process.env.GH_PAT;

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) throw new Error("Không tìm thấy release");

    const release = await response.json();
    const ipas = (release.assets || []).filter((a) => a.name.endsWith(".ipa")).map((a) => a.name);

    return res.status(200).json({ ipas });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}