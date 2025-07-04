import { useState } from "react";
import axios from "axios";

export default function CertUploader() {
  const [form, setForm] = useState({
    tag: "",
    identifier: "",
    password: ""
  });
  const [p12, setP12] = useState(null);
  const [provision, setProvision] = useState(null);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!p12 || !provision || !form.password || !form.tag || !form.identifier) {
      setMessage("Vui lòng điền đầy đủ thông tin và file.");
      return;
    }

    const formData = new FormData();
    formData.append("p12", p12);
    formData.append("provision", provision);
    formData.append("password", form.password);
    formData.append("tag", form.tag);
    formData.append("identifier", form.identifier);

    try {
      const res = await axios.post("/api/admin/upload-certs", formData);
      setMessage(res.data.message || "Tải lên thành công!");
    } catch (err) {
      setMessage("Lỗi khi tải lên: " + err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
      <div>
        <label className="block font-medium">Release Tag (chứa IPA)</label>
        <input type="text" value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} required />
      </div>
      <div>
        <label className="block font-medium">Bundle Identifier mới</label>
        <input type="text" value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required />
      </div>
      <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
        Tải lên và ký IPA
      </button>
      {message && <p className="mt-2 text-sm">{message}</p>}
    </form>
  );
}