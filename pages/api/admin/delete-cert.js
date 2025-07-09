import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { name } = req.query;

  if (!name) {
    return res.status(400).json({ message: "Thiếu tên chứng chỉ" });
  }

  try {
    const filesToDelete = [
      `certificates/${name}.p12`,
      `certificates/${name}.mobileprovision`,
    ];

    const { error: storageError } = await supabase.storage
      .from("certificates")
      .remove(filesToDelete);

    if (storageError) {
      console.warn("⚠️ Không xoá được file storage:", storageError.message);
    }

    const { error } = await supabase
      .from("certificates")
      .delete()
      .eq("name", name);

    if (error) {
      return res.status(500).json({ message: "Lỗi xoá DB", error: error.message });
    }

    return res.status(200).json({ message: "Đã xoá chứng chỉ và file thành công" });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
  }
}