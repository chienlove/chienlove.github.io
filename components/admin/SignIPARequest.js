import { useState, useEffect } from "react";
import axios from "axios";
import RunStepsViewer from "./RunStepsViewer";
import {
  faSpinner,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faCertificate,
  faTag,
  faBox,
  faCog,
  faRocket,
  faDownload,
  faInfoCircle,
  faExclamationTriangle,
  faChevronDown,
  faCheck,
  faEdit,
  faKey,
  faPackage,
  faPaperPlane
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
    selectedIpa: "",
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
      setForm(prev => ({ ...prev, selectedIpa: "" }));
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

  const getStatusIcon = (status) => {
    switch (status) {
      case "success":
        return <FontAwesomeIcon icon={faCheckCircle} className="text-green-400" />;
      case "failure":
        return <FontAwesomeIcon icon={faTimesCircle} className="text-red-400" />;
      case "in_progress":
        return <FontAwesomeIcon icon={faHourglassHalf} className="text-yellow-400" />;
      default:
        return <FontAwesomeIcon icon={faSpinner} spin className="text-blue-400" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "success": return "Hoàn tất";
      case "failure": return "Thất bại";
      case "in_progress": return "Đang xử lý";
      default: return "Đang kiểm tra...";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-4 px-4 sm:py-8 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mb-3 sm:mb-4 shadow-lg transform hover:scale-105 transition-transform duration-300">
            <FontAwesomeIcon icon={faRocket} className="text-white text-xl sm:text-2xl" />
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent mb-2">
            Ký IPA Tự Động
          </h1>
          <p className="text-gray-600 text-base sm:text-lg max-w-2xl mx-auto">
            Gửi yêu cầu ký IPA với chứng chỉ của bạn một cách nhanh chóng và an toàn
          </p>
        </div>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Certificate Selection */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:bg-white/90">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg mr-3 flex-shrink-0">
                <FontAwesomeIcon icon={faCertificate} className="text-blue-600 text-sm sm:text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Chứng chỉ</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Chọn chứng chỉ để ký IPA</p>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full p-3 sm:p-4 pr-8 sm:pr-10 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white text-gray-900 text-sm sm:text-base"
                value={form.certName}
                onChange={(e) => setForm({ ...form, certName: e.target.value })}
                required
              >
                <option value="">Chọn chứng chỉ...</option>
                {certs.map((cert) => (
                  <option key={cert.id} value={cert.name}>
                    {cert.name}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm"
              />
            </div>
          </div>

          {/* Tag Selection */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:bg-white/90">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-lg mr-3 flex-shrink-0">
                <FontAwesomeIcon icon={faTag} className="text-green-600 text-sm sm:text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Release Tag</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Chọn phiên bản để ký</p>
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full p-3 sm:p-4 pr-8 sm:pr-10 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 appearance-none bg-white text-gray-900 text-sm sm:text-base"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
                required
              >
                <option value="">Chọn release tag...</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <FontAwesomeIcon 
                icon={faChevronDown} 
                className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none text-sm"
              />
            </div>
          </div>

          {/* IPA Selection */}
          {ipas.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:bg-white/90">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg mr-3 flex-shrink-0">
                  <FontAwesomeIcon icon={faBox} className="text-purple-600 text-sm sm:text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">File IPA</h3>
                  <p className="text-xs sm:text-sm text-gray-500 truncate">Chọn file IPA để ký</p>
                </div>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <label className="flex items-center p-2 sm:p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 min-h-[44px]">
                  <input
                    type="radio"
                    name="ipaSelection"
                    checked={form.selectedIpa === ""}
                    onChange={() => setForm({ ...form, selectedIpa: "" })}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                    form.selectedIpa === "" ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {form.selectedIpa === "" && (
                      <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                    )}
                  </div>
                  <div className="flex items-center min-w-0 flex-1">
                    <FontAwesomeIcon icon={faPackage} className="text-gray-400 mr-2 flex-shrink-0 text-sm" />
                    <span className="font-medium text-gray-900 text-sm sm:text-base truncate">Ký tất cả ({ipas.length} file)</span>
                  </div>
                </label>
                
                {ipas.map((file, i) => (
                  <label key={i} className="flex items-center p-2 sm:p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200 min-h-[44px]">
                    <input
                      type="radio"
                      name="ipaSelection"
                      checked={form.selectedIpa === file}
                      onChange={() => setForm({ ...form, selectedIpa: file })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 mr-2 sm:mr-3 flex items-center justify-center flex-shrink-0 ${
                      form.selectedIpa === file ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                    }`}>
                      {form.selectedIpa === file && (
                        <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                      )}
                    </div>
                    <div className="flex items-center min-w-0 flex-1">
                      <FontAwesomeIcon icon={faDownload} className="text-gray-400 mr-2 flex-shrink-0 text-sm" />
                      <span className="text-gray-900 text-sm sm:text-base break-all">{file}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Section */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-sm border border-gray-200/50 p-4 sm:p-6 transition-all duration-300 hover:shadow-md hover:bg-white/90">
            <div className="flex items-center mb-3 sm:mb-4">
              <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-orange-100 rounded-lg mr-3 flex-shrink-0">
                <FontAwesomeIcon icon={faCog} className="text-orange-600 text-sm sm:text-base" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Cấu hình</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Tùy chỉnh thông tin ứng dụng</p>
              </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {form.selectedIpa && (
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                    <FontAwesomeIcon icon={faEdit} className="mr-1 sm:mr-2 text-gray-400 text-xs sm:text-sm" />
                    Tên hiển thị (Display Name)
                  </label>
                  <input
                    type="text"
                    className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                    placeholder="Để trống sẽ giữ nguyên tên gốc"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                  <FontAwesomeIcon icon={faKey} className="mr-1 sm:mr-2 text-gray-400 text-xs sm:text-sm" />
                  Bundle Identifier
                </label>
                <input
                  type="text"
                  className="w-full p-3 sm:p-4 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm sm:text-base"
                  placeholder="Để trống sẽ tự động sinh"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1 flex items-center">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-1 flex-shrink-0" />
                  <span>Nếu để trống, hệ thống sẽ tự động tạo identifier</span>
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3 sm:gap-4">
            <button
              type="submit"
              disabled={loading}
              className={`w-full inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-semibold rounded-xl sm:rounded-2xl transition-all duration-300 transform min-h-[44px] ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 hover:scale-[1.02] shadow-lg hover:shadow-xl active:scale-[0.98]'
              } text-white`}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                  Gửi yêu cầu ký IPA
                </>
              )}
            </button>

            {message && (
              <div className={`flex items-start p-3 sm:p-4 rounded-lg sm:rounded-xl ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <FontAwesomeIcon 
                  icon={message.includes('✅') ? faCheckCircle : faExclamationTriangle} 
                  className="mr-2 mt-0.5 flex-shrink-0 text-sm sm:text-base" 
                />
                <span className="text-xs sm:text-sm font-medium break-words">{message}</span>
              </div>
            )}
          </div>
        </form>

        {/* Progress Section */}
        {currentRequest && (
          <div className="mt-6 sm:mt-8">
            <div className="bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 rounded-xl sm:rounded-2xl shadow-lg p-4 sm:p-6 text-white">
              <div className="flex items-center mb-3 sm:mb-4">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-600 rounded-lg mr-3 flex-shrink-0">
                  <FontAwesomeIcon icon={faHourglassHalf} className="text-white text-sm sm:text-base" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold truncate">Tiến trình đang theo dõi</h3>
                  <p className="text-gray-300 text-xs sm:text-sm truncate">Theo dõi quá trình ký IPA</p>
                </div>
              </div>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 sm:mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-1 sm:mb-2">
                      <FontAwesomeIcon icon={faTag} className="text-blue-400 mr-2 flex-shrink-0 text-sm" />
                      <span className="font-semibold text-base sm:text-lg truncate">{currentRequest.tag}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <FontAwesomeIcon icon={faKey} className="mr-2 flex-shrink-0 text-sm" />
                      <span className="text-xs sm:text-sm truncate">{currentRequest.identifier || "(auto identifier)"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end">
                    <span className="text-xs sm:text-sm text-gray-400 mr-2 sm:mr-3">Trạng thái:</span>
                    <div className={`flex items-center px-2 sm:px-3 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-semibold ${
                      status === "success"
                        ? "bg-green-600 text-white"
                        : status === "failure"
                        ? "bg-red-600 text-white"
                        : status === "in_progress"
                        ? "bg-yellow-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}>
                      {getStatusIcon(status)}
                      <span className="ml-1 sm:ml-2 whitespace-nowrap">{getStatusText(status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {runId && (
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4">
                  <RunStepsViewer runId={runId} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

