import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ message: "Thiếu ID tiến trình" });
  }

  try {
    const { error } = await supabase
      .from("sign_requests")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("❌ Lỗi xoá tiến trình:", error.message);
      return res.status(500).json({ message: "Không thể xoá tiến trình" });
    }

    return res.status(200).json({ message: "Đã xoá tiến trình" });
  } catch (err) {
    console.error("❌ Exception khi xoá:", err.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
}