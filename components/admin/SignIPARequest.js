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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg">
            <FontAwesomeIcon icon={faRocket} className="text-white text-2xl" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ký IPA Tự Động</h1>
            <p className="text-gray-600">Gửi yêu cầu ký IPA với chứng chỉ của bạn</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Certificate Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <div className="flex items-center text-white">
                <FontAwesomeIcon icon={faCertificate} className="text-xl mr-3" />
                <div>
                  <h3 className="font-semibold text-lg">Chứng chỉ</h3>
                  <p className="text-blue-100 text-sm">Chọn chứng chỉ để ký IPA</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="relative">
                <select
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none bg-white text-gray-900"
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
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Release Tag Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
              <div className="flex items-center text-white">
                <FontAwesomeIcon icon={faTag} className="text-xl mr-3" />
                <div>
                  <h3 className="font-semibold text-lg">Release Tag</h3>
                  <p className="text-green-100 text-sm">Chọn phiên bản để ký</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="relative">
                <select
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all appearance-none bg-white text-gray-900"
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
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* IPA Selection Card */}
          {ipas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
                <div className="flex items-center text-white">
                  <FontAwesomeIcon icon={faBox} className="text-xl mr-3" />
                  <div>
                    <h3 className="font-semibold text-lg">File IPA</h3>
                    <p className="text-purple-100 text-sm">Chọn file IPA để ký</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-3">
                <label className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all min-h-[60px]">
                  <input
                    type="radio"
                    name="ipaSelection"
                    checked={form.selectedIpa === ""}
                    onChange={() => setForm({ ...form, selectedIpa: "" })}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                    form.selectedIpa === "" ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                  }`}>
                    {form.selectedIpa === "" && (
                      <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                    )}
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faPackage} className="text-gray-400 mr-3" />
                    <span className="font-medium text-gray-900">Ký tất cả ({ipas.length} file)</span>
                  </div>
                </label>
                
                {ipas.map((file, i) => (
                  <label key={i} className="flex items-center p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-all min-h-[60px]">
                    <input
                      type="radio"
                      name="ipaSelection"
                      checked={form.selectedIpa === file}
                      onChange={() => setForm({ ...form, selectedIpa: file })}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${
                      form.selectedIpa === file ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                    }`}>
                      {form.selectedIpa === file && (
                        <FontAwesomeIcon icon={faCheck} className="text-white text-xs" />
                      )}
                    </div>
                    <div className="flex items-center min-w-0">
                      <FontAwesomeIcon icon={faDownload} className="text-gray-400 mr-3 flex-shrink-0" />
                      <span className="text-gray-900 break-all">{file}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Configuration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4">
              <div className="flex items-center text-white">
                <FontAwesomeIcon icon={faCog} className="text-xl mr-3" />
                <div>
                  <h3 className="font-semibold text-lg">Cấu hình</h3>
                  <p className="text-orange-100 text-sm">Tùy chỉnh thông tin ứng dụng</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {form.selectedIpa && (
                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                    <FontAwesomeIcon icon={faEdit} className="mr-2 text-gray-400" />
                    Tên hiển thị (Display Name)
                  </label>
                  <input
                    type="text"
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                    placeholder="Để trống sẽ giữ nguyên tên gốc"
                    value={form.displayName}
                    onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  />
                </div>
              )}
              
              <div>
                <label className="flex items-center text-sm font-medium text-gray-700 mb-3">
                  <FontAwesomeIcon icon={faKey} className="mr-2 text-gray-400" />
                  Bundle Identifier
                </label>
                <input
                  type="text"
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                  placeholder="Để trống sẽ tự động sinh"
                  value={form.identifier}
                  onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                />
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <FontAwesomeIcon icon={faInfoCircle} className="mr-2" />
                  Nếu để trống, hệ thống sẽ tự động tạo identifier
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl transition-all duration-300 min-h-[60px] ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl active:scale-[0.98]'
              } text-white`}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin className="mr-3" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faPaperPlane} className="mr-3" />
                  Gửi yêu cầu ký IPA
                </>
              )}
            </button>

            {message && (
              <div className={`mt-4 flex items-start p-4 rounded-xl ${
                message.includes('✅') 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <FontAwesomeIcon 
                  icon={message.includes('✅') ? faCheckCircle : faExclamationTriangle} 
                  className="mr-3 mt-0.5 flex-shrink-0" 
                />
                <span className="text-sm font-medium">{message}</span>
              </div>
            )}
          </div>
        </form>

        {/* Progress Card */}
        {currentRequest && (
          <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl shadow-lg text-white overflow-hidden">
            <div className="px-6 py-4 bg-black/20">
              <div className="flex items-center">
                <FontAwesomeIcon icon={faHourglassHalf} className="text-xl mr-3" />
                <div>
                  <h3 className="text-xl font-semibold">Tiến trình đang theo dõi</h3>
                  <p className="text-gray-300 text-sm">Theo dõi quá trình ký IPA</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-gray-800/50 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center mb-2">
                      <FontAwesomeIcon icon={faTag} className="text-blue-400 mr-2" />
                      <span className="font-semibold text-lg">{currentRequest.tag}</span>
                    </div>
                    <div className="flex items-center text-gray-300">
                      <FontAwesomeIcon icon={faKey} className="mr-2" />
                      <span className="text-sm">{currentRequest.identifier || "(auto identifier)"}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-400 mr-3">Trạng thái:</span>
                    <div className={`flex items-center px-4 py-2 rounded-full text-sm font-semibold ${
                      status === "success"
                        ? "bg-green-600"
                        : status === "failure"
                        ? "bg-red-600"
                        : status === "in_progress"
                        ? "bg-yellow-600"
                        : "bg-blue-600"
                    }`}>
                      {getStatusIcon(status)}
                      <span className="ml-2">{getStatusText(status)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {runId && (
                <div className="bg-gray-800/50 rounded-xl p-4">
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
