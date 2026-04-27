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
  const [form, setForm] = useState({ 
    certName: "", 
    tag: "", 
    identifier: "",
    selectedIpas: [], // SỬA: Đổi thành mảng (array) thay vì string
    displayName: "" 
  });
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
    axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`).then((res) => {
      setIpas(res.data.ipas || []);
      // Reset selectedIpas về mảng rỗng khi đổi tag
      setForm(prev => ({ ...prev, selectedIpas: [], identifier: "", displayName: "" }));
    });
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
        identifier: form.selectedIpas.length <= 1 ? form.identifier : "", // Bỏ identifier nếu ký nhiều
        selectedIpa: form.selectedIpas.join(","), // SỬA: Nối mảng thành chuỗi cách nhau bằng dấu phẩy
        displayName: form.selectedIpas.length <= 1 ? form.displayName : "" // Bỏ display name nếu ký nhiều
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
          <>
            <div>
              <label className="block font-medium">📦 Chọn file IPA (Có thể chọn nhiều):</label>
              <div className="space-y-2 mt-2 p-3 border rounded bg-gray-50 dark:bg-gray-700/30">
                {/* Nút Chọn tất cả */}
                <label className="flex items-center gap-2 font-semibold text-blue-600 dark:text-blue-400 border-b pb-2 mb-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={form.selectedIpas.length === ipas.length && ipas.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setForm({ ...form, selectedIpas: [...ipas] });
                      } else {
                        setForm({ ...form, selectedIpas: [] });
                      }
                    }}
                  />
                  <span>Chọn tất cả ({ipas.length} file)</span>
                </label>
                
                {/* Danh sách các file dạng Checkbox */}
                {ipas.map((file, i) => (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={form.selectedIpas.includes(file)}
                      onChange={(e) => {
                        const isChecked = e.target.checked;
                        setForm((prev) => {
                          const currentSelected = prev.selectedIpas;
                          if (isChecked) {
                            return { ...prev, selectedIpas: [...currentSelected, file] };
                          } else {
                            return { ...prev, selectedIpas: currentSelected.filter(f => f !== file) };
                          }
                        });
                      }}
                    />
                    <span>{file}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Chỉ hiện Tên và Bundle ID khi chọn ĐÚNG 1 file hoặc 0 file (tức là muốn ký hết với 1 ID - dù hơi rủi ro) */}
            {form.selectedIpas.length <= 1 ? (
              <>
                <div>
                  <label className="block font-medium">🆔 Tên hiển thị (Display Name)</label>
                  <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="(Tùy chọn) Để trống sẽ giữ nguyên tên gốc"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  />
                </div>
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
              </>
            ) : (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded text-yellow-800 dark:text-yellow-200 text-sm">
                ⚠️ <strong>Lưu ý:</strong> Bạn đang chọn ký nhiều file cùng lúc. Các tùy chọn "Tên hiển thị" và "Bundle Identifier" đã được ẩn để tránh việc các ứng dụng bị trùng ID và đè lên nhau trên điện thoại. Hệ thống sẽ tự động cấp ID riêng biệt cho từng app.
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={loading || (ipas.length > 0 && form.selectedIpas.length === 0)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 font-bold disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "⏳ Đang gửi..." : "🚀 Gửi yêu cầu ký IPA"}
        </button>

        {message && <p className="text-sm mt-2">{message}</p>}
      </form>

      {/* Phần tiến trình */}
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
