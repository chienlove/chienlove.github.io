import { useEffect, useState } from "react";
import axios from "axios";

export default function RunStepsViewer({ runId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runId) return;

    const fetchSteps = async () => {
      try {
        const res = await axios.get(`/api/admin/run-steps?run_id=${runId}`);
        setSteps(res.data.steps || []);
        setError("");
      } catch (err) {
        console.error("⚠️ Lỗi khi lấy danh sách bước:", err.message);
        setError("Không thể lấy danh sách bước");
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
    const interval = setInterval(fetchSteps, 5000); // Polling mỗi 5s
    return () => clearInterval(interval);
  }, [runId]);

  if (loading) return <div className="text-sm text-gray-500 mt-2">Đang tải bước thực hiện...</div>;

  return (
    <div className="mt-2 ml-4 text-sm">
      {error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <>
          <p className="font-medium mb-1">📋 Các bước đã thực hiện:</p>
          <ul className="space-y-1 list-disc ml-4">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-1">
                {step.conclusion === "success" ? (
                  <span>✅</span>
                ) : step.conclusion === "failure" ? (
                  <span>❌</span>
                ) : step.status === "in_progress" ? (
                  <span>⏳</span>
                ) : (
                  <span>🔄</span>
                )}
                <span>{step.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}