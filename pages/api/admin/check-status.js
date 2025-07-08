export default async function handler(req, res) {
  const { tag } = req.query;
  const GITHUB_TOKEN = process.env.GH_PAT;
  const REPO = "chienlove/chienlove.github.io";

  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  if (!tag) {
    return res.status(400).json({ status: "invalid", message: "Thiếu tag" });
  }

  if (!GITHUB_TOKEN) {
    return res.status(500).json({ message: "Thiếu biến môi trường GH_PAT" });
  }

  try {
    const url = `https://api.github.com/repos/${REPO}/actions/runs?event=workflow_dispatch&per_page=20`;
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

    const matched = data.workflow_runs.find(
      (r) =>
        r.head_branch === "master" &&
        r.display_title?.includes(tag) &&
        r.event === "workflow_dispatch"
    );

    if (!matched) {
      return res.status(200).json({ status: "unknown" });
    }

    return res.status(200).json({
      status: matched.status,
      conclusion: matched.conclusion,
      html_url: matched.html_url,
      run_id: matched.id,
    });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
  }
}