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
  if (!id) return res.status(400).json({ message: "Thiếu ID chứng chỉ" });

  try {
    // 1. Truy vấn bản ghi chứng chỉ
    const { data, error: fetchError } = await supabase
      .from("certificates")
      .select("p12_url, provision_url")
      .eq("id", id)
      .single();

    if (fetchError || !data) {
      return res.status(404).json({ message: "Không tìm thấy chứng chỉ" });
    }

    // 2. Tách đường dẫn file từ URL
    const p12Path = data.p12_url?.split("/certificates/")[1];
    const provisionPath = data.provision_url?.split("/certificates/")[1];
    const filesToDelete = [p12Path, provisionPath].filter(Boolean);

    // 3. Xoá file khỏi Supabase Storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabase
        .storage
        .from("certificates")
        .remove(filesToDelete);

      if (storageError) {
        console.warn("⚠️ Không xoá được file storage:", storageError.message);
      }
    }

    // 4. Xoá bản ghi trong DB
    const { error: deleteError } = await supabase
      .from("certificates")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return res.status(500).json({ message: "Lỗi xoá DB", error: deleteError.message });
    }

    return res.status(200).json({ message: "✅ Đã xoá chứng chỉ và file thành công" });
  } catch (err) {
    return res.status(500).json({ message: "❌ Lỗi hệ thống", error: err.message });
  }
}