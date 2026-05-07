export default async function handler(req, res) {
  const { url } = req.query;

  if (!url || !url.startsWith("http")) {
    return res.status(400).json({ error: "Thiếu hoặc sai URL" });
  }

  try {
    const decodedUrl = decodeURIComponent(url); // ✅ Quan trọng
    const response = await fetch(decodedUrl, { method: "HEAD" });

    if (!response.ok) {
      return res.status(500).json({ error: "Không thể kết nối tới IPA" });
    }

    const size = response.headers.get("content-length");

    if (!size) {
      return res.status(404).json({ error: "Không tìm thấy Content-Length" });
    }

    res.status(200).json({ size });
  } catch (err) {
    res.status(500).json({ error: "Lỗi máy chủ", detail: err.message });
  }
}