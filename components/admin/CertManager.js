import { useState, useEffect } from "react";
import axios from "axios";

export default function CertManager() {
  const [certs, setCerts] = useState([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [p12, setP12] = useState(null);
  const [provision, setProvision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");

  async function fetchCerts() {
    try {
      const res = await axios.get("/api/admin/list-certs");
      setCerts(res.data.certs || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách cert:", err);
    }
  }

  useEffect(() => {
    fetchCerts();
  }, []);

  async function handleUpload(e) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!p12 || !provision || !password) {
      setMessage("❌ Vui lòng chọn đủ file và nhập mật khẩu");
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      const finalName = name.trim() || p12.name.replace(".p12", "") + "-" + Date.now();

      formData.append("name", finalName);
      formData.append("p12", p12);
      formData.append("provision", provision);
      formData.append("password", password);

      const res = await axios.post("/api/admin/upload-certs", formData);
      setMessage("✅ " + res.data.message);
      setName("");
      setPassword("");
      setP12(null);
      setProvision(null);
      fetchCerts();
    } catch (err) {
      console.error(err);
      setMessage("❌ " + (err.response?.data?.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const cert = certs.find((c) => c.id === id);
    if (!cert) return;

    if (!confirm(`Bạn có chắc muốn xoá chứng chỉ "${cert.name}" không?`)) return;

    try {
      await axios.delete(`/api/admin/delete-cert?id=${id}`);
      setMessage("🗑️ Đã xoá chứng chỉ và file thành công");
      fetchCerts();
    } catch (err) {
      setMessage("❌ Lỗi khi xoá chứng chỉ");
    }
  }

  async function handleRename(id) {
    if (!newName.trim()) return;
    try {
      await axios.patch(`/api/admin/cert/${id}`, { name: newName });
      setMessage("✅ Đã đổi tên chứng chỉ");
      setEditingId(null);
      setNewName("");
      fetchCerts();
    } catch (err) {
      setMessage("❌ Lỗi khi đổi tên");
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">📥 Tải lên chứng chỉ mới</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block font-medium">Tên chứng chỉ (tuỳ chọn)</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="(Không bắt buộc)"
          />
        </div>

        <div>
          <label className="block font-medium">Mật khẩu file .p12</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block font-medium">File .p12</label>
          <input type="file" accept=".p12" onChange={(e) => setP12(e.target.files[0])} required />
        </div>

        <div>
          <label className="block font-medium">File .mobileprovision</label>
          <input type="file" accept=".mobileprovision" onChange={(e) => setProvision(e.target.files[0])} required />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? "⏳ Đang tải lên..." : "Tải lên"}
        </button>
        {message && <p className="text-sm mt-2">{message}</p>}
      </form>

      <hr className="my-6" />

      <h2 className="text-lg font-semibold">📄 Danh sách chứng chỉ</h2>
      {certs.length === 0 ? (
        <p className="text-gray-500">Chưa có chứng chỉ nào.</p>
      ) : (
        <ul className="space-y-3">
          {certs.map((cert) => (
            <li
              key={cert.id}
              className="p-3 border rounded flex items-center justify-between flex-wrap gap-3"
            >
              <div>
                <strong className="block">{cert.name}</strong>
                <small className="text-gray-500">Cập nhật: {new Date(cert.updated_at).toLocaleString()}</small>
              </div>

              <div className="flex items-center gap-2">
                {editingId === cert.id ? (
                  <>
                    <input
                      type="text"
                      className="border p-1 rounded"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                    <button
                      onClick={() => handleRename(cert.id)}
                      className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Lưu
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setNewName("");
                      }}
                      className="px-2 py-1 text-sm text-gray-600 hover:underline"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(cert.id);
                        setNewName(cert.name);
                      }}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      ✏️ Đổi tên
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      🗑️ Xoá
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}