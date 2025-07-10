import { useEffect, useState } from "react";
import axios from "axios";
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faCircleNotch,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
        setError("");
      } catch (err) {
        console.warn("⚠️ Lỗi khi lấy danh sách bước:", err.message);
        setError("Không thể lấy danh sách bước");
      } finally {
        setLoading(false);
      }
    }

    fetchSteps();
    const interval = setInterval(fetchSteps, 5000);
    return () => clearInterval(interval);
  }, [runId]);

  if (loading) {
    return (
      <p className="text-sm text-gray-300 flex items-center gap-2">
        <FontAwesomeIcon icon={faSpinner} spin /> Đang tải bước...
      </p>
    );
  }

  return (
    <div className="mt-2 text-sm">
      {error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <>
          <p className="font-semibold mb-1 text-white">📋 Các bước đã thực hiện:</p>
          <ul className="space-y-1 text-left ml-0">
            {steps.map((step, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-white">
                  {step.conclusion === "success" ? (
                    <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />
                  ) : step.conclusion === "failure" ? (
                    <FontAwesomeIcon icon={faTimesCircle} className="text-red-400" />
                  ) : step.status === "in_progress" ? (
                    <FontAwesomeIcon icon={faHourglassHalf} className="text-yellow-400" />
                  ) : (
                    <FontAwesomeIcon icon={faCircleNotch} spin className="text-gray-400" />
                  )}
                </span>
                <span className="text-white">{step.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}