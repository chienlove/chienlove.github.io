import { useState, useEffect } from "react";
import axios from "axios";

export default function SignIPARequest() {
  const [certs, setCerts] = useState([]);
  const [tags, setTags] = useState([]);
  const [ipas, setIpas] = useState([]);
  const [form, setForm] = useState({ certName: "", tag: "", identifier: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Fetch certs
  useEffect(() => {
    axios.get("/api/admin/list-certs")
      .then(res => setCerts(res.data.certs || []))
      .catch(() => setMessage("❌ Lỗi lấy danh sách chứng chỉ"));
  }, []);

  // Fetch GitHub release tags
  useEffect(() => {
    axios.get("/api/admin/github-tags")
      .then(res => setTags(res.data.tags || []))
      .catch(() => setMessage("❌ Lỗi lấy danh sách release tag"));
  }, []);

  // Fetch IPA files in selected tag
  useEffect(() => {
    if (!form.tag) return;
    axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`)
      .then(res => setIpas(res.data.ipas || []))
      .catch(() => setMessage("❌ Lỗi lấy danh sách IPA trong tag"));
  }, [form.tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!form.certName || !form.tag || !form.identifier) {
      setMessage("❌ Vui lòng điền đầy đủ thông tin");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post("/api/admin/use-certs", {
        name: form.certName,
        tag: form.tag,
        identifier: form.identifier
      });

      setMessage("✅ Đã gửi yêu cầu ký IPA thành công!");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Lỗi gửi yêu cầu ký"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold">🚀 Gửi yêu cầu ký IPA</h2>

      <div>
        <label className="block font-medium">🔐 Chọn chứng chỉ</label>
        <select
          className="w-full p-2 border rounded"
          value={form.certName}
          onChange={(e) => setForm({ ...form, certName: e.target.value })}
          required
        >
          <option value="">-- Chọn chứng chỉ --</option>
          {certs.map((cert) => (
            <option key={cert.id} value={cert.name}>{cert.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium">🏷 Chọn release tag</label>
        <select
          className="w-full p-2 border rounded"
          value={form.tag}
          onChange={(e) => setForm({ ...form, tag: e.target.value })}
          required
        >
          <option value="">-- Chọn tag --</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>

      {ipas.length > 0 && (
        <div>
          <p className="font-medium">📦 File IPA trong tag:</p>
          <ul className="list-disc ml-5 text-sm text-gray-700 dark:text-gray-300">
            {ipas.map((file, i) => (
              <li key={i}>{file}</li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block font-medium">🆔 Bundle Identifier mới</label>
        <input
          type="text"
          className="w-full p-2 border rounded"
          placeholder="com.example.app"
          value={form.identifier}
          onChange={(e) => setForm({ ...form, identifier: e.target.value })}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? "⏳ Đang gửi..." : "🚀 Gửi yêu cầu ký IPA"}
      </button>

      {message && <p className="text-sm mt-2">{message}</p>}
    </form>
  );
}