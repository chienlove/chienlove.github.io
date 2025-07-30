import { useState, useEffect } from "react";
import axios from "axios";
import RunStepsViewer from "./RunStepsViewer";
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faCheck,
  faBoxOpen,
  faFileArchive,
  faCloudDownloadAlt,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export default function SignIPARequest() {
  const [certs, setCerts] = useState([]);
  const [tags, setTags] = useState([]);
  const [ipaDetails, setIpaDetails] = useState([]);
  const [form, setForm] = useState({ 
    certName: "", 
    tag: "", 
    identifier: "",
    selectedIpa: "",
    displayName: ""
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [currentRequest, setCurrentRequest] = useState(null);
  const [status, setStatus] = useState("unknown");
  const [runId, setRunId] = useState(null);
  const [isFetchingIpas, setIsFetchingIpas] = useState(false);

  useEffect(() => {
    axios.get("/api/admin/list-certs").then((res) => setCerts(res.data.certs || []));
    axios.get("/api/admin/github-tags").then((res) => setTags(res.data.tags || []));
  }, []);

  useEffect(() => {
    if (!form.tag) {
      setIpaDetails([]);
      return;
    }

    const fetchIpaDetails = async () => {
      setIsFetchingIpas(true);
      try {
        const res = await axios.get(`/api/admin/ipas-in-tag?tag=${form.tag}`);
        const ipas = res.data.ipas || [];
        
        // Lấy thông tin kích thước cho từng IPA
        const details = await Promise.all(ipas.map(async (ipa) => {
          try {
            const sizeRes = await axios.get(`/api/admin/ipa-size?tag=${form.tag}&file=${ipa}`);
            return {
              name: ipa,
              size: sizeRes.data.size || 0,
              downloadUrl: sizeRes.data.downloadUrl || "#"
            };
          } catch (error) {
            console.error(`Error getting size for ${ipa}:`, error);
            return {
              name: ipa,
              size: 0,
              downloadUrl: "#"
            };
          }
        }));
        
        setIpaDetails(details);
        setForm(prev => ({ ...prev, selectedIpa: "" }));
      } catch (error) {
        console.error("Error fetching IPA details:", error);
        setIpaDetails([]);
      } finally {
        setIsFetchingIpas(false);
      }
    };

    fetchIpaDetails();
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
        selectedIpa: form.selectedIpa,
        displayName: form.displayName
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

  const formatFileSize = (bytes) => {
    if (!bytes || isNaN(bytes)) return 'N/A';
    const sizes = ['bytes', 'KB', 'MB', 'GB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FontAwesomeIcon icon={faFileArchive} className="text-blue-500" />
          <span>🚀 Gửi yêu cầu ký IPA</span>
        </h2>

        <div className="space-y-4">
          {/* Chọn chứng chỉ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FontAwesomeIcon icon={faCheckCircle} className="mr-2 text-blue-500" />
              Chọn chứng chỉ
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
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

          {/* Chọn tag */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FontAwesomeIcon icon={faBoxOpen} className="mr-2 text-blue-500" />
              Chọn release tag
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
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

          {/* Danh sách IPA */}
          {isFetchingIpas ? (
            <div className="flex items-center justify-center py-4">
              <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 mr-2" />
              <span className="text-gray-600 dark:text-gray-400">Đang tải danh sách IPA...</span>
            </div>
          ) : ipaDetails.length > 0 ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <FontAwesomeIcon icon={faCloudDownloadAlt} className="mr-2 text-blue-500" />
                  File IPA trong tag
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {ipaDetails.length} file
                </span>
              </div>

              <div className="space-y-2">
                <label className="flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-blue-50/50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                  <input
                    type="radio"
                    name="ipaSelection"
                    checked={form.selectedIpa === ""}
                    onChange={() => setForm({ ...form, selectedIpa: "" })}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-800 dark:text-white">Ký tất cả file</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Tất cả {ipaDetails.length} file IPA sẽ được ký
                    </div>
                  </div>
                </label>

                {ipaDetails.map((ipa, i) => (
                  <label 
                    key={i} 
                    className={`flex items-start p-3 rounded-lg border transition-colors cursor-pointer ${
                      form.selectedIpa === ipa.name
                        ? "border-blue-300 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-700"
                        : "border-gray-200 dark:border-gray-600 hover:bg-gray-50/50 dark:hover:bg-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="ipaSelection"
                      checked={form.selectedIpa === ipa.name}
                      onChange={() => setForm({ ...form, selectedIpa: ipa.name })}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800 dark:text-white truncate">
                          {ipa.name}
                        </span>
                        {form.selectedIpa === ipa.name && (
                          <FontAwesomeIcon 
                            icon={faCheck} 
                            className="text-green-500 ml-2 flex-shrink-0" 
                          />
                        )}
                      </div>
                      <div className="flex items-center mt-1 text-xs">
                        <span className="text-gray-500 dark:text-gray-400 mr-3">
                          Kích thước: {formatFileSize(ipa.size)}
                        </span>
                        <a 
                          href={ipa.downloadUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Xem trước
                        </a>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ) : form.tag ? (
            <div className="text-center py-4 text-gray-500 dark:text-gray-400">
              Không tìm thấy file IPA nào trong tag này
            </div>
          ) : null}

          {/* Display Name */}
          {form.selectedIpa && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Tên hiển thị (Display Name)
              </label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                placeholder="Nhập tên hiển thị mới (để trống giữ nguyên tên gốc)"
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              />
            </div>
          )}

          {/* Bundle Identifier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bundle Identifier mới
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="Nhập Bundle Identifier mới (để trống sẽ tự sinh)"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
            />
          </div>
        </div>

        {/* Nút submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading || isFetchingIpas}
            className={`w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              loading || isFetchingIpas ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                Đang gửi yêu cầu...
              </>
            ) : (
              "🚀 Gửi yêu cầu ký IPA"
            )}
          </button>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.startsWith("✅") 
              ? "bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200" 
              : "bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200"
          }`}>
            {message}
          </div>
        )}
      </form>

      {/* Phần hiển thị tiến trình */}
      {currentRequest && (
        <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FontAwesomeIcon 
                icon={
                  status === "success" ? faCheckCircle : 
                  status === "failure" ? faTimesCircle : 
                  status === "in_progress" ? faHourglassHalf : faSpinner
                } 
                className={
                  status === "success" ? "text-green-500" : 
                  status === "failure" ? "text-red-500" : 
                  status === "in_progress" ? "text-yellow-500" : "text-blue-500"
                } 
              />
              <span>Tiến trình ký IPA</span>
            </h3>
            
            <div className="bg-black text-white p-4 rounded-md text-sm font-mono">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold">Tag:</span> {currentRequest.tag}
                </div>
                <div>
                  <span className="font-bold">Trạng thái:</span>{" "}
                  <span className={
                    status === "success" ? "text-green-400" : 
                    status === "failure" ? "text-red-400" : 
                    status === "in_progress" ? "text-yellow-400" : "text-gray-400"
                  }>
                    {status === "success" ? "Hoàn thành" : 
                     status === "failure" ? "Thất bại" : 
                     status === "in_progress" ? "Đang xử lý" : "Đang kiểm tra..."}
                  </span>
                </div>
              </div>
              
              {runId && (
                <div className="mt-4">
                  <RunStepsViewer runId={runId} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}