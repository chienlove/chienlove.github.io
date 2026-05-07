import { useState, useEffect } from "react";
import axios from "axios";
import RunStepsViewer from "./RunStepsViewer";
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function SignIPARequest() {
  const [certs, setCerts] = useState([]);
  const [tags, setTags] = useState([]);
  const [ipas, setIpas] = useState([]);
  const [form, setForm] = useState({ certName: "", tag: "", identifier: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [status, setStatus] = useState("unknown");
  const [runId, setRunId] = useState(null);

  useEffect(() => {
    axios.get("/api/admin/list-certs").then((res) => setCerts(res.data.certs || []));
    axios.get("/api/admin/github-tags").then((res) => setTags(res.data.tags || []));
  }, []);

  useEffect(() => {
    if (!form.tag) return;
    axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`).then((res) => setIpas(res.data.ipas || []));
  }, [form.tag]);

  useEffect(() => {
    if (!currentRequest) return;
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`/api/admin/check-status?tag=${currentRequest.tag}`);
        const newStatus = res.data.conclusion || res.data.status || "unknown";
        setStatus(newStatus);
        if (res.data.run_id) setRunId(res.data.run_id);

        if (["completed", "success", "failure"].includes(newStatus)) {
          setTimeout(async () => {
            await axios.delete(`/api/admin/delete-request?id=${currentRequest.id}`);
            setCurrentRequest(null);
          }, 180000);
          clearInterval(interval);
        }
      } catch (err) {
        console.error("❌ Lỗi theo dõi tiến trình:", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [currentRequest]);

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
      const req = await axios.get("/api/admin/sign-requests");
      setCurrentRequest(req.data.requests?.[0] || null);
      setStatus("pending");
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Lỗi gửi yêu cầu"));
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
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold"
        >
          {loading ? "⏳ Đang gửi..." : "🚀 Gửi yêu cầu ký IPA"}
        </button>

        {message && <p className="text-sm mt-2">{message}</p>}
      </form>

      {/* ✅ Toàn bộ phần tiến trình nằm TRONG nền đen */}
      {currentRequest && (
        <div className="mt-8">
          <div className="p-4 bg-black text-white rounded text-sm shadow text-left border border-gray-700">
            <h3 className="text-md font-semibold mb-2">📊 Tiến trình đang theo dõi:</h3>
            <div className="flex justify-between items-center">
              <div>
                <strong>{currentRequest.tag}</strong> --{" "}
                <span>{currentRequest.identifier || "(auto identifier)"}</span>
              </div>
              <div>
                Trạng thái:{" "}
                <span
                  className={
                    status === "success"
                      ? "text-green-400 font-semibold"
                      : status === "failure"
                      ? "text-red-400 font-semibold"
                      : status === "in_progress"
                      ? "text-yellow-400 font-semibold"
                      : "text-gray-400"
                  }
                >
                  {status === "success" ? (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} className="mr-1" />
                      Hoàn tất
                    </>
                  ) : status === "failure" ? (
                    <>
                      <FontAwesomeIcon icon={faTimesCircle} className="mr-1" />
                      Thất bại
                    </>
                  ) : status === "in_progress" ? (
                    <>
                      <FontAwesomeIcon icon={faHourglassHalf} className="mr-1" />
                      Đang xử lý
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin className="mr-1" />
                      Đang kiểm tra...
                    </>
                  )}
                </span>
              </div>
            </div>

            {runId && (
              <div className="mt-2">
                <RunStepsViewer runId={runId} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}