import { useState, useEffect } from "react";
import axios from "axios";

export default function CertManager() {
  const [certs, setCerts] = useState([]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [p12, setP12] = useState(null);
  const [provision, setProvision] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [newName, setNewName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    fetchCerts();
  }, []);

  async function fetchCerts() {
    try {
      const res = await axios.get("/api/admin/list-certs");
      setCerts(res.data.certs || []);
    } catch (err) {
      showToast("❌ Lỗi khi lấy danh sách chứng chỉ");
    }
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleUpload(e) {
    e.preventDefault();
    setLoading(true);

    if (!p12 || !provision || !password) {
      showToast("❌ Vui lòng chọn đủ file và nhập mật khẩu");
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

      await axios.post("/api/admin/upload-certs", formData);
      showToast("✅ Đã tải lên thành công");
      setName(""); setPassword(""); setP12(null); setProvision(null);
      fetchCerts();
    } catch (err) {
      showToast("❌ " + (err.response?.data?.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    try {
      await axios.delete(`/api/admin/cert/${id}/delete-cert`);
      showToast("🗑️ Đã xoá chứng chỉ");
      fetchCerts();
    } catch (err) {
      showToast("❌ Lỗi khi xoá chứng chỉ");
    }
  }

  async function handleRename(id) {
    if (!newName.trim()) return;
    try {
      await axios.patch(`/api/admin/cert/${id}`, { name: newName });
      showToast("✅ Đã đổi tên");
      setEditingId(null);
      setNewName("");
      fetchCerts();
    } catch (err) {
      showToast("❌ Lỗi khi đổi tên");
    }
  }

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">📥 Tải lên chứng chỉ mới</h2>

      <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded shadow">
        <div>
          <label className="block font-medium">Tên chứng chỉ (tuỳ chọn)</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
        </div>

        <div>
          <label className="block font-medium">Mật khẩu file .p12</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
            className="w-full p-2 border rounded dark:bg-gray-700 dark:text-white" />
        </div>

        <div>
          <label className="block font-medium">File .p12</label>
          <input type="file" accept=".p12" onChange={(e) => setP12(e.target.files[0])} required />
        </div>

        <div>
          <label className="block font-medium">File .mobileprovision</label>
          <input type="file" accept=".mobileprovision" onChange={(e) => setProvision(e.target.files[0])} required />
        </div>

        <div className="md:col-span-2">
          <button type="submit" disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            {loading ? "⏳ Đang tải lên..." : "Tải lên"}
          </button>
        </div>
      </form>

      <h2 className="text-xl font-semibold">📄 Danh sách chứng chỉ</h2>
      {certs.length === 0 ? (
        <p className="text-gray-500">Chưa có chứng chỉ nào.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {certs.map((cert) => (
            <div key={cert.id} className="p-4 bg-white dark:bg-gray-800 rounded shadow">
              <div className="mb-2">
                {editingId === cert.id ? (
                  <>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="border p-1 rounded dark:bg-gray-700 dark:text-white"
                    />
                    <button onClick={() => handleRename(cert.id)} className="ml-2 text-green-600 text-sm">Lưu</button>
                    <button onClick={() => { setEditingId(null); setNewName(""); }} className="ml-2 text-gray-500 text-sm">Hủy</button>
                  </>
                ) : (
                  <>
                    <strong className="text-lg">{cert.name}</strong>
                    <small className="block text-sm text-gray-500">🕒 {new Date(cert.updated_at).toLocaleString()}</small>
                  </>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setEditingId(cert.id); setNewName(cert.name); }}
                  className="text-blue-600 text-sm hover:underline">✏️ Đổi tên</button>

                <button onClick={() => setDeleteConfirmId(cert.id)}
                  className="text-red-600 text-sm hover:underline">🗑️ Xoá</button>
              </div>

              {/* Modal xác nhận xoá */}
              {deleteConfirmId === cert.id && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
                  <div className="bg-white dark:bg-gray-900 p-6 rounded shadow max-w-sm w-full">
                    <h3 className="text-lg font-semibold mb-2">Bạn chắc chắn muốn xoá?</h3>
                    <p className="text-sm mb-4 text-gray-500">Chứng chỉ sẽ bị xoá khỏi hệ thống và storage.</p>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-white rounded">
                        Hủy
                      </button>
                      <button
                        onClick={() => { handleDelete(cert.id); setDeleteConfirmId(null); }}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700">
                        Xoá
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-black text-white px-4 py-2 rounded shadow z-50">
          {toast}
        </div>
      )}
    </div>
  );
}