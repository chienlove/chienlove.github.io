// components/CertUploader.js
import { useState, useEffect } from "react";
import axios from "axios";

export default function CertUploader() {
  const [certs, setCerts] = useState([]);
  const [mode, setMode] = useState("upload");
  const [selectedCert, setSelectedCert] = useState("");
  const [form, setForm] = useState({
    tag: "",
    identifier: "",
    password: ""
  });
  const [p12, setP12] = useState(null);
  const [provision, setProvision] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchCerts() {
      try {
        const res = await axios.get("/api/admin/list-certs");
        setCerts(res.data.certs || []);
      } catch (e) {
        console.error("Lỗi lấy danh sách cert:", e);
      }
    }
    fetchCerts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!form.tag || !form.identifier) {
      setMessage("❌ Vui lòng nhập đầy đủ tag và identifier");
      setLoading(false);
      return;
    }

    try {
      if (mode === "upload") {
        if (!p12 || !provision || !form.password) {
          setMessage("❌ Vui lòng chọn đủ file và nhập mật khẩu");
          setLoading(false);
          return;
        }

        const p12Name = p12.name.replace('.p12', '');
        const formData = new FormData();
        formData.append("name", p12Name);
        formData.append("p12", p12);
        formData.append("provision", provision);
        formData.append("password", form.password);
        formData.append("tag", form.tag);
        formData.append("identifier", form.identifier);

        const res = await axios.post("/api/admin/upload-certs", formData);
        setMessage("✅ " + res.data.message);
      } else {
        if (!selectedCert) {
          setMessage("❌ Vui lòng chọn chứng chỉ sẵn có");
          setLoading(false);
          return;
        }

        await axios.post("/api/admin/use-certs", {
          name: selectedCert,
          tag: form.tag,
          identifier: form.identifier
        }, {
          headers: { "Content-Type": "application/json" }
        });

        setMessage("✅ Đã gửi yêu cầu ký IPA với chứng chỉ đã chọn");
      }
    } catch (err) {
      setMessage("❌ Lỗi: " + (err?.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-lg font-semibold mb-2">🔐 Quản lý chứng chỉ & ký IPA</h2>

      <div className="space-x-4">
        <label>
          <input type="radio" value="upload" checked={mode === "upload"} onChange={() => setMode("upload")} />
          <span className="ml-1">Upload chứng chỉ mới</span>
        </label>
        <label>
          <input type="radio" value="select" checked={mode === "select"} onChange={() => setMode("select")} />
          <span className="ml-1">Dùng chứng chỉ sẵn có</span>
        </label>
      </div>

      {mode === "upload" && (
        <>
          <div>
            <label className="block font-medium">File .p12</label>
            <input type="file" accept=".p12" onChange={(e) => setP12(e.target.files[0])} required />
          </div>
          <div>
            <label className="block font-medium">File .mobileprovision</label>
            <input type="file" accept=".mobileprovision" onChange={(e) => setProvision(e.target.files[0])} required />
          </div>
          <div>
            <label className="block font-medium">Mật khẩu file .p12</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </div>
        </>
      )}

      {mode === "select" && (
        <div>
          <label className="block font-medium">Chọn chứng chỉ</label>
          <select className="border rounded w-full p-2" value={selectedCert} onChange={(e) => setSelectedCert(e.target.value)} required>
            <option value="">-- Chọn --</option>
            {certs.map((cert) => (
              <option key={cert.id} value={cert.name}>
                {cert.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block font-medium">🏷 Release Tag (chứa IPA)</label>
        <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} required />
      </div>

      <div>
        <label className="block font-medium">🆔 Bundle Identifier mới</label>
        <input type="text" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
      </div>

      <button type="submit" disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded">
        {loading ? "⏳ Đang xử lý..." : "🚀 Gửi yêu cầu ký IPA"}
      </button>

      {message && <p className="mt-3 text-sm">{message}</p>}
    </form>
  );
}