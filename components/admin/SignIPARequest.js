import { useState, useEffect } from "react";
import axios from "axios";
import RunStepsViewer from "./RunStepsViewer";

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
        return <i className="fas fa-check-circle text-green-500"></i>;
      case "failure":
        return <i className="fas fa-times-circle text-red-500"></i>;
      case "in_progress":
        return <i className="fas fa-hourglass-half text-yellow-500"></i>;
      default:
        return <i className="fas fa-spinner fa-spin text-blue-500"></i>;
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

  const getStatusColor = (status) => {
    switch (status) {
      case "success": return "from-green-500 to-emerald-600";
      case "failure": return "from-red-500 to-rose-600";
      case "in_progress": return "from-yellow-500 to-orange-600";
      default: return "from-blue-500 to-indigo-600";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                <i className="fas fa-rocket text-xl"></i>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Ký IPA Tự Động</h1>
                <p className="text-sm text-gray-500">Gửi yêu cầu ký IPA với chứng chỉ của bạn</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <i className="fas fa-shield-alt text-green-500"></i>
                <span>Bảo mật cao</span>
              </div>
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <i className="fas fa-bolt text-yellow-500"></i>
                <span>Tự động hóa</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Status Message */}
        {message && (
          <div className={`rounded-2xl p-6 border-l-4 ${
            message.includes('✅') 
              ? 'bg-green-50 border-green-500 text-green-800' 
              : 'bg-red-50 border-red-500 text-red-800'
          } shadow-sm`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <i className={`fas ${message.includes('✅') ? 'fa-check-circle' : 'fa-exclamation-triangle'} text-xl mt-0.5`}></i>
                <div>
                  <h4 className="font-semibold mb-1">
                    {message.includes('✅') ? 'Thành công!' : 'Có lỗi xảy ra'}
                  </h4>
                  <p className="text-sm">{message}</p>
                </div>
              </div>
              <button 
                onClick={() => setMessage("")}
                className="text-current hover:opacity-70 p-1 rounded transition-all"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        )}

        {/* Request Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <div className="flex items-center text-white">
              <i className="fas fa-cogs text-2xl mr-4"></i>
              <div>
                <h2 className="text-2xl font-bold">Cấu hình yêu cầu ký</h2>
                <p className="text-blue-100 mt-1">Thiết lập thông tin để ký IPA tự động</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            
            {/* Certificate Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
                  <i className="fas fa-certificate"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Chứng chỉ ký</h3>
                  <p className="text-sm text-gray-500">Chọn chứng chỉ để ký IPA</p>
                </div>
              </div>
              
              <div className="relative">
                <select
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none bg-white text-gray-900 font-medium"
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
                <i className="fas fa-chevron-down absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>
              
              {certs.length === 0 && (
                <div className="flex items-center space-x-2 text-sm text-amber-600 bg-amber-50 px-4 py-3 rounded-xl">
                  <i className="fas fa-exclamation-triangle"></i>
                  <span>Chưa có chứng chỉ nào được tải lên. Vui lòng tải lên chứng chỉ trước.</span>
                </div>
              )}
            </div>

            {/* Release Tag Selection */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center text-white">
                  <i className="fas fa-tag"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Release Tag</h3>
                  <p className="text-sm text-gray-500">Chọn phiên bản để ký</p>
                </div>
              </div>
              
              <div className="relative">
                <select
                  className="w-full px-6 py-4 border-2 border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 transition-all appearance-none bg-white text-gray-900 font-medium"
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
                <i className="fas fa-chevron-down absolute right-6 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
              </div>
            </div>

            {/* IPA Selection */}
            {ipas.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
                    <i className="fas fa-box"></i>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">File IPA</h3>
                    <p className="text-sm text-gray-500">Chọn file IPA để ký ({ipas.length} file có sẵn)</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Sign All Option */}
                  <label className="flex items-center p-6 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all group">
                    <input
                      type="radio"
                      name="ipaSelection"
                      checked={form.selectedIpa === ""}
                      onChange={() => setForm({ ...form, selectedIpa: "" })}
                      className="sr-only"
                    />
                    <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                      form.selectedIpa === "" ? 'border-purple-500 bg-purple-500' : 'border-gray-300 group-hover:border-purple-300'
                    }`}>
                      {form.selectedIpa === "" && (
                        <i className="fas fa-check text-white text-xs"></i>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center text-white">
                        <i className="fas fa-layer-group"></i>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Ký tất cả file IPA</p>
                        <p className="text-sm text-gray-500">{ipas.length} file sẽ được ký</p>
                      </div>
                    </div>
                  </label>
                  
                  {/* Individual IPA Files */}
                  {ipas.map((file, i) => (
                    <label key={i} className="flex items-center p-6 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-purple-300 hover:bg-purple-50/50 transition-all group">
                      <input
                        type="radio"
                        name="ipaSelection"
                        checked={form.selectedIpa === file}
                        onChange={() => setForm({ ...form, selectedIpa: file })}
                        className="sr-only"
                      />
                      <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${
                        form.selectedIpa === file ? 'border-purple-500 bg-purple-500' : 'border-gray-300 group-hover:border-purple-300'
                      }`}>
                        {form.selectedIpa === file && (
                          <i className="fas fa-check text-white text-xs"></i>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 min-w-0">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                          <i className="fas fa-mobile-alt"></i>
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{file}</p>
                          <p className="text-sm text-gray-500">File IPA riêng lẻ</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Configuration */}
            <div className="space-y-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
                  <i className="fas fa-cog"></i>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Cấu hình nâng cao</h3>
                  <p className="text-sm text-gray-500">Tùy chỉnh thông tin ứng dụng</p>
                </div>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                {/* Display Name */}
                {form.selectedIpa && (
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700">
                      <i className="fas fa-edit mr-2 text-orange-500"></i>
                      Tên hiển thị
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                      placeholder="Để trống sẽ giữ nguyên tên gốc"
                      value={form.displayName}
                      onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                    />
                  </div>
                )}
                
                {/* Bundle Identifier */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-gray-700">
                    <i className="fas fa-key mr-2 text-orange-500"></i>
                    Bundle Identifier
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                    placeholder="Để trống sẽ tự động sinh"
                    value={form.identifier}
                    onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="flex items-start space-x-2 text-sm text-gray-500 bg-gray-50 px-4 py-3 rounded-xl">
                <i className="fas fa-info-circle mt-0.5 text-blue-500"></i>
                <p>Nếu để trống Bundle Identifier, hệ thống sẽ tự động tạo identifier duy nhất cho ứng dụng.</p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading || !form.certName || !form.tag}
                className={`w-full flex items-center justify-center px-8 py-6 text-lg font-bold rounded-2xl transition-all duration-300 ${
                  loading || !form.certName || !form.tag
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-105 shadow-xl hover:shadow-2xl active:scale-95'
                } text-white`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Đang gửi yêu cầu...
                  </>
                ) : (
                  <>
                    <i className="fas fa-paper-plane mr-3"></i>
                    Gửi yêu cầu ký IPA
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Progress Tracking */}
        {currentRequest && (
          <div className="bg-white rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${getStatusColor(status)} px-8 py-6`}>
              <div className="flex items-center text-white">
                <div className="text-2xl mr-4">
                  {getStatusIcon(status)}
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Tiến trình ký IPA</h2>
                  <p className="text-white/90 mt-1">Theo dõi quá trình ký tự động</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              {/* Status Overview */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-tag text-blue-600 text-xl"></i>
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Release Tag</p>
                      <p className="text-lg font-bold text-blue-900">{currentRequest.tag}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-certificate text-green-600 text-xl"></i>
                    <div>
                      <p className="text-sm text-green-600 font-medium">Chứng chỉ</p>
                      <p className="text-lg font-bold text-green-900">{currentRequest.certName}</p>
                    </div>
                  </div>
                </div>
                
                <div className={`bg-gradient-to-br rounded-2xl p-6 ${
                  status === 'success' ? 'from-emerald-50 to-emerald-100' :
                  status === 'failure' ? 'from-red-50 to-red-100' :
                  status === 'in_progress' ? 'from-yellow-50 to-yellow-100' :
                  'from-gray-50 to-gray-100'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className="text-xl">
                      {getStatusIcon(status)}
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        status === 'success' ? 'text-emerald-600' :
                        status === 'failure' ? 'text-red-600' :
                        status === 'in_progress' ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>Trạng thái</p>
                      <p className={`text-lg font-bold ${
                        status === 'success' ? 'text-emerald-900' :
                        status === 'failure' ? 'text-red-900' :
                        status === 'in_progress' ? 'text-yellow-900' :
                        'text-gray-900'
                      }`}>{getStatusText(status)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {currentRequest.identifier && (
                <div className="bg-gray-50 rounded-2xl p-6">
                  <div className="flex items-center space-x-3">
                    <i className="fas fa-key text-gray-600"></i>
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Bundle Identifier</p>
                      <p className="text-gray-900 font-mono text-sm">{currentRequest.identifier}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Run Steps Viewer */}
              {runId && (
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <i className="fas fa-list-ol text-gray-600"></i>
                    <h3 className="text-lg font-semibold text-gray-900">Chi tiết quá trình</h3>
                  </div>
                  <RunStepsViewer runId={runId} />
                </div>
              )}

              {/* Auto-cleanup Notice */}
              {["completed", "success", "failure"].includes(status) && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <div className="flex items-start space-x-3">
                    <i className="fas fa-clock text-blue-600 mt-0.5"></i>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Thông báo tự động</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Yêu cầu này sẽ được tự động xóa sau 3 phút để giữ giao diện gọn gàng.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 border border-indigo-100">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white flex-shrink-0">
              <i className="fas fa-question-circle"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Cần hỗ trợ?</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-upload text-indigo-500 mt-1"></i>
                  <div>
                    <p className="font-semibold text-gray-900">Tải lên chứng chỉ</p>
                    <p className="text-sm text-gray-600">Truy cập trang Admin để tải lên chứng chỉ .p12</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-code-branch text-indigo-500 mt-1"></i>
                  <div>
                    <p className="font-semibold text-gray-900">Release Tags</p>
                    <p className="text-sm text-gray-600">Tags được lấy tự động từ GitHub repository</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-mobile-alt text-indigo-500 mt-1"></i>
                  <div>
                    <p className="font-semibold text-gray-900">File IPA</p>
                    <p className="text-sm text-gray-600">Chọn file cụ thể hoặc ký tất cả file trong tag</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <i className="fas fa-cogs text-indigo-500 mt-1"></i>
                  <div>
                    <p className="font-semibold text-gray-900">Tự động hóa</p>
                    <p className="text-sm text-gray-600">Quá trình ký diễn ra tự động qua GitHub Actions</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

