import { useState, useEffect } from "react";
import axios from "axios";
import RunStepsViewer from "./RunStepsViewer";

export default function SignIPARequest() {
  const [certs, setCerts] = useState([]);
  const [tags, setTags] = useState([]);
  const [ipas, setIpas] = useState([]);
  const [form, setForm] = useState({ certName: "", tag: "", identifier: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showProgress, setShowProgress] = useState(false);

  useEffect(() => {
    axios.get("/api/admin/list-certs").then((res) => setCerts(res.data.certs || []));
    axios.get("/api/admin/github-tags").then((res) => setTags(res.data.tags || []));
  }, []);

  useEffect(() => {
    if (!form.tag) return;
    axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`).then((res) => setIpas(res.data.ipas || []));
  }, [form.tag]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    if (!form.certName || !form.tag) {
      setMessage("❌ Vui lòng chọn chứng chỉ và tag");
      setLoading(false);
      return;
    }

    try {
      await axios.post("/api/admin/use-certs", {
        name: form.certName,
        tag: form.tag,
        identifier: form.identifier,
      });

      setMessage("✅ Đã gửi yêu cầu ký IPA thành công!");
      setShowProgress(true); // ✅ Chỉ lúc này mới bật theo dõi tiến trình
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Lỗi gửi yêu cầu ký"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
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
              <option key={cert.id} value={cert.name}>
                {cert.name}
              </option>
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
              <option key={tag} value={tag}>
                {tag}
              </option>
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
            placeholder="(Không bắt buộc) Nếu để trống sẽ tự sinh"
            value={form.identifier}
            onChange={(e) => setForm({ ...form, identifier: e.target.value })}
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

      {showProgress && <ProgressTracker />}
    </>
  );
}

function ProgressTracker() {
  const [requests, setRequests] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [runIds, setRunIds] = useState({});

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  async function fetchRequests() {
    try {
      const res = await axios.get("/api/admin/sign-requests");
      const reqs = res.data.requests || [];
      setRequests(reqs);

      for (let req of reqs) {
        const statusRes = await axios.get(`/api/admin/check-status?tag=${req.tag}`);
        const status = statusRes.data.conclusion || statusRes.data.status || "unknown";
        const runId = statusRes.data.run_id || null;

        setStatuses((prev) => ({ ...prev, [req.id]: status }));
        if (runId) setRunIds((prev) => ({ ...prev, [req.id]: runId }));
      }
    } catch (err) {
      console.error("Lỗi khi theo dõi tiến trình:", err.message);
    }
  }

  // 🔥 Tự xoá sau 3 phút nếu tiến trình đã hoàn tất
  useEffect(() => {
    requests.forEach((r) => {
      const created = new Date(r.created_at);
      const now = new Date();
      const elapsed = now - created;

      if (elapsed > 3 * 60 * 1000 && ["success", "failure"].includes(statuses[r.id])) {
        axios.delete(`/api/admin/delete-request?id=${r.id}`)
          .then(() => {
            console.log("🗑 Đã xoá tiến trình hết hạn:", r.tag);
            setRequests((prev) => prev.filter((item) => item.id !== r.id));
          })
          .catch((err) => {
            console.warn("⚠️ Lỗi khi xoá tiến trình:", err.message);
          });
      }
    });
  }, [requests, statuses]);

  if (requests.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="text-md font-semibold mb-2">📊 Tiến trình đang theo dõi:</h3>
      <ul className="space-y-4">
        {requests.map((r) => (
          <li key={r.id} className="p-3 bg-gray-100 rounded text-sm">
            <div className="flex justify-between items-center">
              <div>
                <strong>{r.tag}</strong> --{" "}
                <span className="text-gray-700">
                  {r.identifier || "(auto identifier)"}
                </span>
              </div>
              <div>
                Trạng thái:{" "}
                <span
                  className={
                    statuses[r.id] === "success"
                      ? "text-green-600 font-semibold"
                      : statuses[r.id] === "failure"
                      ? "text-red-600 font-semibold"
                      : statuses[r.id] === "in_progress"
                      ? "text-yellow-600 font-semibold"
                      : "text-gray-600"
                  }
                >
                  {statuses[r.id] === "success"
                    ? "✅ Hoàn tất"
                    : statuses[r.id] === "failure"
                    ? "❌ Thất bại"
                    : statuses[r.id] === "in_progress"
                    ? "⏳ Đang xử lý"
                    : "Đang kiểm tra..."}
                </span>
              </div>
            </div>

            {/* ✅ Hiển thị danh sách bước nếu có runId */}
            {runIds[r.id] && <RunStepsViewer runId={runIds[r.id]} />}
          </li>
        ))}
      </ul>
    </div>
  );
}