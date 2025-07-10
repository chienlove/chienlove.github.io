import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTrash,
  faPen,
  faSave,
  faTimes,
  faUpload,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";

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
  const [deletingId, setDeletingId] = useState(null);
  const [renamingId, setRenamingId] = useState(null);

  const p12Ref = useRef();
  const provisionRef = useRef();

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
      p12Ref.current.value = "";
      provisionRef.current.value = "";
      fetchCerts();
    } catch (err) {
      console.error(err);
      setMessage("❌ " + (err.response?.data?.message || "Lỗi không xác định"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Bạn có chắc muốn xoá chứng chỉ này?")) return;

    setDeletingId(id);
    try {
      await axios.delete(`/api/admin/cert/${id}/delete-cert`);
      setMessage("🗑️ Đã xoá chứng chỉ");
      fetchCerts();
    } catch (err) {
      setMessage("❌ Lỗi khi xoá chứng chỉ");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRename(id) {
    if (!newName.trim()) return;
    setRenamingId(id);
    try {
      await axios.patch(`/api/admin/cert/${id}`, { name: newName });
      setMessage("✅ Đã đổi tên chứng chỉ");
      setEditingId(null);
      setNewName("");
      fetchCerts();
    } catch (err) {
      setMessage("❌ Lỗi khi đổi tên");
    } finally {
      setRenamingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">📥 Tải lên chứng chỉ mới</h2>
      <form onSubmit={handleUpload} className="space-y-4">
        <div>
          <label className="block font-semibold">📝 Tên chứng chỉ (tùy chọn)</label>
          <input
            type="text"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: MyCert-2025"
          />
        </div>

        <div>
          <label className="block font-semibold">🔑 Mật khẩu file .p12</label>
          <input
            type="password"
            className="w-full p-2 border rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu file .p12"
            required
          />
        </div>

        <div>
          <label className="block font-medium">📁 File .p12</label>
          <input
            type="file"
            accept=".p12"
            onChange={(e) => setP12(e.target.files[0])}
            ref={p12Ref}
            required
          />
        </div>

        <div>
          <label className="block font-medium">📄 File .mobileprovision</label>
          <input
            type="file"
            accept=".mobileprovision"
            onChange={(e) => setProvision(e.target.files[0])}
            ref={provisionRef}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700 flex items-center gap-2"
        >
          {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faUpload} />}
          {loading ? "Đang tải lên..." : "Tải lên"}
        </button>
        {message && (
          <p
            className={`text-sm mt-2 px-3 py-2 rounded ${
              message.startsWith("✅")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-600"
            }`}
          >
            {message}
          </p>
        )}
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
                <strong className="block text-md">{cert.name}</strong>
                <small className="text-gray-500">
                  Cập nhật: {new Date(cert.updated_at).toLocaleString()}
                </small>
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
                      disabled={renamingId === cert.id}
                      className="bg-green-600 text-white px-2 py-1 text-sm rounded font-bold hover:bg-green-700 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faSave} />
                      Lưu
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(null);
                        setNewName("");
                      }}
                      className="text-gray-600 hover:underline text-sm font-bold flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Huỷ
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditingId(cert.id);
                        setNewName(cert.name);
                      }}
                      className="bg-green-600 text-white px-2 py-1 text-sm rounded font-bold hover:bg-green-700 flex items-center gap-1"
                    >
                      <FontAwesomeIcon icon={faPen} />
                      Đổi tên
                    </button>
                    <button
                      onClick={() => handleDelete(cert.id)}
                      disabled={deletingId === cert.id}
                      className="bg-red-600 text-white px-2 py-1 text-sm rounded font-bold hover:bg-red-700 flex items-center gap-1"
                    >
                      {deletingId === cert.id ? (
                        <FontAwesomeIcon icon={faSpinner} spin />
                      ) : (
                        <FontAwesomeIcon icon={faTrash} />
                      )}
                      Xoá
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