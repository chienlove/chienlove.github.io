export default async function handler(req, res) {
  const { run_id } = req.query;
  const GITHUB_TOKEN = process.env.GH_PAT;
  const REPO = "chienlove/chienlove.github.io";

  if (!run_id) {
    return res.status(400).json({ message: "Thiếu run_id" });
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ message: "Thiếu biến môi trường GH_PAT" });
  }

  try {
    const url = `https://api.github.com/repos/${REPO}/actions/runs/${run_id}/jobs`;
    const ghRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
      },
    });

    if (!ghRes.ok) {
      const error = await ghRes.json();
      return res.status(ghRes.status).json({ message: error.message || "Lỗi GitHub" });
    }

    const data = await ghRes.json();
    const job = data.jobs?.[0];
    const steps = job?.steps || [];

    return res.status(200).json({ steps });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
  }
}