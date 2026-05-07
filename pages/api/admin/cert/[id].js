// pages/api/admin/cert/[id].js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ message: "Thiếu ID chứng chỉ" });

  try {
    if (req.method === "DELETE") {
      const { error } = await supabase.from("certificates").delete().eq("id", id);
      if (error) throw error;
      return res.status(200).json({ message: "Đã xoá chứng chỉ" });
    }

    if (req.method === "PATCH") {
      const { name } = req.body;
      if (!name) return res.status(400).json({ message: "Thiếu tên mới" });

      const { error } = await supabase.from("certificates").update({ name }).eq("id", id);
      if (error) throw error;
      return res.status(200).json({ message: "Đã đổi tên chứng chỉ" });
    }

    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}