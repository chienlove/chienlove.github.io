import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    // 🔍 Lấy danh sách tiến trình từ bảng sign_requests
    const { data, error } = await supabase
      .from("sign_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ message: "Lỗi lấy danh sách", error });
    return res.status(200).json({ requests: data });
  }

  if (req.method === "DELETE") {
    const { id } = req.query;
    if (!id) return res.status(400).json({ message: "Thiếu ID cần xoá" });

    const { error } = await supabase.from("sign_requests").delete().eq("id", id);
    if (error) return res.status(500).json({ message: "Xoá thất bại", error });

    return res.status(200).json({ message: "Đã xoá tiến trình" });
  }

  return res.status(405).json({ message: "Phương thức không được hỗ trợ" });
}