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
  const [requests, setRequests] = useState([]);
  const [statuses, setStatuses] = useState({});

  // Lấy certs và tags
  useEffect(() => {
    axios.get("/api/admin/list-certs").then((res) => setCerts(res.data.certs || []));
    axios.get("/api/admin/github-tags").then((res) => setTags(res.data.tags || []));
  }, []);

  // Lấy danh sách IPA trong tag
  useEffect(() => {
    if (!form.tag) return;
    axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`).then((res) => setIpas(res.data.ipas || []));
  }, [form.tag]);

  // Gửi yêu cầu ký IPA
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
      setForm({ certName: "", tag: "", identifier: "" });
      setTimeout(fetchRequests, 1000);
    } catch (err) {
      setMessage("❌ " + (err.response?.data?.message || "Lỗi gửi yêu cầu ký"));
    } finally {
      setLoading(false);
    }
  };

  // Theo dõi tiến trình
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

      for (let r of reqs) {
        if (!statuses[r.id] || ["pending", "in_progress", "unknown"].includes(statuses[r.id])) {
          const statusRes = await axios.get(`/api/admin/check-status?tag=${r.tag}`);
          const status = statusRes.data.conclusion || statusRes.data.status || "unknown";
          const runId = statusRes.data.run_id;

          setStatuses((prev) => ({ ...prev, [r.id]: status }));

          // Nếu đã completed, xoá request khỏi Supabase
          if (["success", "failure", "completed"].includes(status)) {
            await axios.post("/api/admin/delete-request", { id: r.id });
          }
        }
      }
    } catch (err) {
      console.warn("Lỗi theo dõi tiến trình:", err.message);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ... (giữ nguyên phần form UI) ... */}
      </form>

      {/* Danh sách tiến trình */}
      {requests.length > 0 && (
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-2">📊 Tiến trình đang theo dõi:</h3>
          <ul className="space-y-4">
            {requests.map((r) => (
              <li key={r.id} className="p-3 bg-gray-100 rounded text-sm">
                <div className="flex justify-between items-center">
                  <div>
                    <strong>{r.tag}</strong> --{" "}
                    <span className="text-gray-700">{r.identifier || "(auto identifier)"}</span>
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

                {/* Chỉ hiển thị RunStepsViewer khi có run_id và đang in_progress */}
                {statuses[r.id] === "in_progress" && (
                  <RunStepsViewer runId={r.run_id} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}