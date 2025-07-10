import { useEffect, useState } from "react";
import axios from "axios";
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function RunStepsViewer({ runId }) {
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!runId) return;

    let isMounted = true;
    let interval;

    const fetchSteps = async () => {
      try {
        const res = await axios.get(`/api/admin/run-steps?run_id=${runId}`);
        if (!isMounted) return;

        const newSteps = res.data.steps || [];
        setSteps(newSteps);
        setError("");

        const allDone = newSteps.every(
          (s) =>
            s.conclusion === "success" ||
            s.conclusion === "failure" ||
            s.status === "completed"
        );

        if (allDone) {
          setIsDone(true);
          clearInterval(interval);
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn("⚠️ Lỗi khi lấy danh sách bước:", err.message);
        setError("Không thể lấy danh sách bước");
        clearInterval(interval);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSteps();
    interval = setInterval(fetchSteps, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [runId]);

  function customLabel(name) {
    const map = {
      "Set up job": "🚀 Bắt đầu tiến trình",
      "Checkout code": "📥 Lấy mã nguồn",
      "Fetch certificate info from Supabase": "🔐 Tải thông tin cert từ Supabase",
      "Download certificate and provisioning profile": "📄 Tải .p12 & mobileprovision",
      "Extract TEAM_ID from mobileprovision": "🔍 Trích xuất TEAM_ID",
      "Set workflow inputs": "⚙️ Thiết lập biến đầu vào",
      "Generate shared random (if needed)": "🎲 Sinh mã ngẫu nhiên",
      "Verify release exists": "🔎 Kiểm tra tag release",
      "Download all IPA files from release": "📦 Tải IPA từ release",
      "Install Zsign": "🔧 Cài Zsign",
      "Patch Info.plist & Binary (auto-generate identifier if not provided)":
        "🛠 Sửa Info.plist & binary",
      "Sign all IPA files with Zsign (overwrite original IPA)": "✍️ Ký IPA bằng Zsign",
      "Upload signed IPA": "☁️ Tải IPA đã ký",
      "Generate plist with version & icon, commit to repo": "📋 Tạo plist và icon",
      "Post Checkout code": "✅ Hoàn tất sao chép mã nguồn",
      "Complete job": "🎉 Hoàn tất toàn bộ tiến trình",
    };
    return map[name] || name;
  }

  if (loading && steps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-white pl-1">
        <FontAwesomeIcon icon={faSpinner} spin />
        <span>Đang tải các bước...</span>
      </div>
    );
  }

  return (
    <div className="mt-2 pl-1 text-sm space-y-2 text-left">
      {error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <>
          <p className="font-medium mb-1 text-white">📋 Các bước:</p>
          <ul className="space-y-1">
            {steps.map((step, idx) => {
              let icon = faSpinner;
              let spin = true;
              let iconColor = "text-white";

              if (step.conclusion === "success") {
                icon = faCheckCircle;
                spin = false;
                iconColor = "text-green-400";
              } else if (step.conclusion === "failure") {
                icon = faTimesCircle;
                spin = false;
                iconColor = "text-red-400";
              } else if (step.status === "in_progress") {
                icon = faHourglassHalf;
                spin = true;
                iconColor = "text-yellow-400";
              }

              return (
                <li key={idx} className="flex items-center gap-2 text-white">
                  <FontAwesomeIcon
                    icon={icon}
                    spin={spin}
                    className={`${iconColor} w-4 h-4`}
                  />
                  <span className="text-white">{customLabel(step.name)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}