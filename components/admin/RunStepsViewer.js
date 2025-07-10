import { useState, useEffect } from "react";
import axios from "axios";
import {
  faCheckCircle,
  faTimesCircle,
  faSpinner,
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

    let interval;
    let stopped = false;

    async function fetchSteps() {
      try {
        const res = await axios.get(`/api/admin/run-steps?run_id=${runId}`);
        const fetched = res.data.steps || [];
        setSteps(fetched);
        setLoading(false);
        setError("");

        const allDone = fetched.every(
          (s) => s.conclusion || s.status === "completed"
        );

        if (allDone && interval) {
          clearInterval(interval);
          stopped = true;
        }
      } catch (err) {
        console.warn("⚠️ Lỗi khi lấy danh sách bước:", err.message);
        setError("Không thể lấy danh sách bước");
        setLoading(false);
      }
    }

    fetchSteps();
    interval = setInterval(() => {
      if (!stopped) fetchSteps();
    }, 5000);

    return () => clearInterval(interval);
  }, [runId]);

  if (loading) {
    return (
      <p className="text-yellow-300 mt-2">
        <FontAwesomeIcon icon={faCircleNotch} spin className="mr-1" />
        Đang tải bước...
      </p>
    );
  }

  return (
    <div className="mt-3 text-sm text-left">
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <p className="font-medium mb-1">📋 Các bước đã thực hiện:</p>
          <ul className="space-y-1 ml-2 text-left">
            {steps.map((step, idx) => {
              let icon = <FontAwesomeIcon icon={faSpinner} spin className="text-gray-300" />;
              if (step.conclusion === "success")
                icon = <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />;
              else if (step.conclusion === "failure")
                icon = <FontAwesomeIcon icon={faTimesCircle} className="text-red-400" />;
              else if (step.status === "in_progress")
                icon = <FontAwesomeIcon icon={faHourglassHalf} className="text-yellow-300" />;

              return (
                <li key={idx} className="flex items-center gap-2">
                  {icon}
                  <span>{step.name}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}