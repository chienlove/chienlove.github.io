import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const {
    query: { id },
  } = req;

  if (!id) return res.status(400).json({ message: "Thiếu ID chứng chỉ" });

  try {
    // Lấy thông tin cert theo id
    const { data: cert, error: getError } = await supabase
      .from("certificates")
      .select("p12_url, provision_url")
      .eq("id", id)
      .single();

    if (getError || !cert) {
      return res.status(404).json({ message: "Không tìm thấy chứng chỉ" });
    }

    const extractFilename = (url) => {
      const parts = url.split("/");
      return parts[parts.length - 1];
    };

    const filesToDelete = [];

    if (cert.p12_url) {
      filesToDelete.push(extractFilename(cert.p12_url));
    }

    if (cert.provision_url) {
      filesToDelete.push(extractFilename(cert.provision_url));
    }

    if (filesToDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from("certificates")
        .remove(filesToDelete);

      if (deleteError) {
        console.warn("⚠️ Không thể xoá file storage:", deleteError.message);
      }
    }

    // Xoá record trong bảng
    const { error: deleteDbError } = await supabase
      .from("certificates")
      .delete()
      .eq("id", id);

    if (deleteDbError) {
      return res.status(500).json({ message: "Lỗi xoá khỏi database" });
    }

    return res.status(200).json({ message: "Đã xoá chứng chỉ thành công" });
  } catch (err) {
    return res.status(500).json({ message: "Lỗi hệ thống", error: err.message });
  }
}