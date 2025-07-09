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

  // Lấy cert trước để biết URL file
  const { data: cert, error: fetchError } = await supabase
    .from("certificates")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !cert) {
    return res.status(404).json({ message: "Không tìm thấy cert" });
  }

  // Xoá file trên Supabase Storage
  const p12Path = cert.p12_url?.split("/certificates/")[1];
  const provisionPath = cert.provision_url?.split("/certificates/")[1];

  if (p12Path || provisionPath) {
    const deleteRes = await supabase.storage
      .from("certificates")
      .remove([p12Path, provisionPath].filter(Boolean));

    if (deleteRes.error) {
      console.warn("⚠️ Không thể xoá file storage:", deleteRes.error.message);
    }
  }

  // Xoá bản ghi trong table
  const { error: deleteError } = await supabase
    .from("certificates")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return res.status(500).json({ message: "Lỗi khi xoá chứng chỉ" });
  }

  return res.status(200).json({ message: "Đã xoá chứng chỉ thành công" });
}