// pages/api/admin/ipa-size.js
export default async function handler(req, res) {
  const { tag, file } = req.query;

  try {
    const GITHUB_REPO = "chienlove/chienlove.github.io";
    const GITHUB_TOKEN = process.env.GH_PAT;
    
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/tags/${tag}`
    );
    
    const release = await response.json();
    const asset = release.assets.find(a => a.name === file);
    
    if (!asset) {
      return res.status(404).json({ message: "File not found" });
    }

    res.status(200).json({ 
      size: asset.size,
      downloadUrl: asset.browser_download_url
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}