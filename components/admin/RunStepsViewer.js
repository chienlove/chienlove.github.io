import { useEffect, useState } from "react";
import axios from "axios";

export default function RunStepsViewer({ runId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!runId) return;

    async function fetchSteps() {
      try {
        const res = await axios.get(`/api/admin/run-steps?run_id=${runId}`);
        setSteps(res.data.steps || []);
      } catch (err) {
        setError("Không thể lấy danh sách bước");
      } finally {
        setLoading(false);
      }
    }

    fetchSteps();
  }, [runId]);

  if (!runId) return null;
  if (loading) return <p className="text-sm text-gray-600">⏳ Đang tải tiến trình...</p>;
  if (error) return <p className="text-sm text-red-500">{error}</p>;

  return (
    <div className="mt-4">
      <h4 className="font-semibold text-sm mb-2">📋 Các bước đã thực hiện:</h4>
      <ul className="space-y-1 text-sm">
        {steps.map((step, i) => (
          <li key={i} className="flex items-center space-x-2">
            <span>
              {step.conclusion === "success" ? "✅" :
               step.conclusion === "failure" ? "❌" :
               step.status === "in_progress" ? "⏳" : "🔄"}
            </span>
            <span>{step.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}