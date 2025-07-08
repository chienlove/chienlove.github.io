export default async function handler(req, res) {
  const GITHUB_TOKEN = process.env.GH_PAT;
  const REPO = "chienlove/chienlove.github.io";
  const { tag } = req.query;

  if (!tag) return res.status(400).json({ message: "Thiếu tag" });
  if (!GITHUB_TOKEN) return res.status(500).json({ message: "Thiếu biến môi trường GH_PAT" });

  try {
    const runsRes = await fetch(
      `https://api.github.com/repos/${REPO}/actions/runs?event=workflow_dispatch&per_page=20`,
      {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!runsRes.ok) {
      const error = await runsRes.json();
      return res.status(runsRes.status).json({ message: error.message || "Lỗi GitHub" });
    }

    const runs = (await runsRes.json()).workflow_runs;

    for (const run of runs) {
      // Bỏ qua run không có id
      if (!run.id) continue;

      // Lấy danh sách jobs trong mỗi run
      const jobsRes = await fetch(run.jobs_url, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
      });

      if (!jobsRes.ok) continue;

      const jobsData = await jobsRes.json();
      const matchedJob = jobsData.jobs?.find((j) => j.name?.includes(`Sign IPA for ${tag}`));

      if (matchedJob) {
        return res.status(200).json({
          status: run.status,
          conclusion: run.conclusion,
          run_id: run.id,
          html_url: run.html_url,
          matched_job: matchedJob.name,
        });
      }
    }

    return res.status(200).json({
      status: "unknown",
      note: "Không tìm thấy job nào chứa tag trong tên",
    });
  } catch (err) {
    return res.status(500).json({
      message: "Lỗi hệ thống",
      error: err.message,
    });
  }
}