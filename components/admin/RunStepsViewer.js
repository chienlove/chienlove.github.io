import { useState, useEffect } from "react";
import axios from "axios";
import {
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faSpinner,
  faRedoAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function RunStepsViewer({ runId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!runId) return;

    const fetchSteps = async () => {
      try {
        const res = await axios.get(`/api/admin/run-steps?run_id=${runId}`);
        const allSteps = res.data.steps || [];
        setSteps(allSteps);
        setError("");

        const isFinished = allSteps.every(
          (s) => s.status === "completed" || s.status === "skipped"
        );
        if (isFinished) setPolling(false);
      } catch (err) {
        setError("Không thể lấy danh sách bước");
      } finally {
        setLoading(false);
      }
    };

    fetchSteps();
    const interval = setInterval(() => {
      if (polling) fetchSteps();
    }, 3000);
    return () => clearInterval(interval);
  }, [runId, polling]);

  if (loading) return <p className="ml-4 text-white text-sm">⏳ Đang tải bước...</p>;
  if (error) return <p className="ml-4 text-red-500 text-sm">{error}</p>;

  return (
    <div className="mt-2 ml-4 text-sm text-white">
      <p className="font-medium mb-1">📋 Các bước đã thực hiện:</p>
      <ul className="space-y-1 ml-0 text-left">
        {steps.map((step, idx) => (
          <li key={idx} className="flex items-center gap-1">
            <FontAwesomeIcon
              icon={
                step.conclusion === "success"
                  ? faCheckCircle
                  : step.conclusion === "failure"
                  ? faTimesCircle
                  : step.status === "in_progress"
                  ? faHourglassHalf
                  : faRedoAlt
              }
              spin={step.status === "in_progress"}
              className={
                step.conclusion === "success"
                  ? "text-green-400"
                  : step.conclusion === "failure"
                  ? "text-red-400"
                  : "text-yellow-300"
              }
            />
            <span>{step.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}