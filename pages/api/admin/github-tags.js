// pages/api/admin/github-tags.js
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const GITHUB_REPO = "chienlove/chienlove.github.io";
  const GITHUB_TOKEN = process.env.GH_PAT;

  if (!GITHUB_TOKEN) return res.status(500).json({ message: "GitHub token is missing" });

  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) throw new Error("GitHub API failed");

    const releases = await response.json();
    const tags = releases.map((r) => r.tag_name);

    return res.status(200).json({ tags });
  } catch (error) {
    return res.status(500).json({ message: "Lỗi khi lấy tag từ GitHub", error: error.message });
  }
}