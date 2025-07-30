import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name, tag, identifier } = req.body;

  if (!name || !tag) {
    return res.status(400).json({ message: "Thiếu name hoặc tag" });
  }

  const GITHUB_TOKEN = process.env.GH_PAT;
  const REPO = "chienlove/chienlove.github.io";

  try {
    console.log("📤 Gửi yêu cầu đến GitHub Action:");
    console.log("➡ name:", name);
    console.log("➡ tag:", tag);
    console.log("➡ identifier:", identifier || "(trống)");

    const ghRes = await fetch(
      `https://api.github.com/repos/${REPO}/actions/workflows/sign-ipa.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github+json",
        },
        body: JSON.stringify({
          ref: "master",
          inputs: {
            tag,
            identifier: identifier || "",
          },
        }),
      }
    );

    if (!ghRes.ok) {
      const error = await ghRes.json();
      console.error("❌ GitHub Action gọi thất bại:", error);
      throw new Error(error.message || "Gửi workflow thất bại");
    }

    console.log("✅ GitHub Action triggered successfully");

    // ✅ Ghi log tiến trình vào Supabase
    const { error } = await supabase.from("sign_requests").insert([
      {
        cert_name: name,
        tag,
        identifier: identifier || "",
        status: "pending",
      },
    ]);
    if (error) {
      console.warn("⚠️ Ghi log Supabase thất bại:", error.message);
    } else {
      console.log("📝 Đã lưu tiến trình vào Supabase");
    }

    return res.status(200).json({ message: "Đã gửi yêu cầu ký IPA thành công" });
  } catch (err) {
    console.error("❌ Lỗi:", err.message);
    return res.status(500).json({ message: err.message });
  }
}