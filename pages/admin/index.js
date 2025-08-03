import { useEffect, useState } from "react";
import jwt from 'jsonwebtoken';
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from 'uuid';
import CertUploader from '../../components/admin/CertUploader';
import CertManagerAndSigner from "../../components/admin/CertManagerAndSigner";

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("apps");
  const [categoryForm, setCategoryForm] = useState({ name: "", fields: [] });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newField, setNewField] = useState("");
  const [screenshotInput, setScreenshotInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  
  // Thêm state cho tính năng AppStore
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [loadingAppStoreInfo, setLoadingAppStoreInfo] = useState(false);

  // Kiểm tra UUID hợp lệ
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id && uuidRegex.test(id);
  };

  // Tạo slug từ tên ứng dụng
  const createSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '-')
      .trim();
  };

  // Hàm lấy thông tin từ AppStore với xử lý lỗi tốt hơn
  const fetchAppStoreInfo = async () => {
    if (!appStoreUrl.trim()) {
      setErrorMessage("Vui lòng nhập URL AppStore");
      return;
    }

    // Validate URL format
    if (!appStoreUrl.includes('apps.apple.com')) {
      setErrorMessage("URL phải là từ App Store (apps.apple.com)");
      return;
    }

    setLoadingAppStoreInfo(true);
    setErrorMessage("");

    try {
      console.log('[Frontend] Fetching AppStore info for URL:', appStoreUrl);
      
      const response = await fetch('/api/admin/appstore-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: appStoreUrl.trim() }),
      });

      console.log('[Frontend] Response status:', response.status);
      console.log('[Frontend] Response headers:', response.headers);
      
      // Kiểm tra content-type trước khi parse JSON
      const contentType = response.headers.get('content-type');
      console.log('[Frontend] Content-Type:', contentType);
      
      let responseData;
      const responseText = await response.text();
      console.log('[Frontend] Response text:', responseText);

      // Chỉ parse JSON nếu response text không rỗng
      if (responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('[Frontend] JSON parse error:', parseError);
          throw new Error(`Phản hồi từ server không phải JSON hợp lệ: ${responseText.substring(0, 100)}...`);
        }
      } else {
        console.error('[Frontend] Empty response from server');
        throw new Error('Server trả về phản hồi rỗng');
      }

      if (!response.ok) {
        const errorMsg = responseData?.error || `HTTP ${response.status}: ${response.statusText}`;
        console.error('[Frontend] API Error:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log('[Frontend] AppStore API response:', responseData);

      // Validate response data
      if (!responseData || !responseData.name) {
        throw new Error('Dữ liệu ứng dụng không đầy đủ (thiếu tên ứng dụng)');
      }

      // Mapping thông tin từ API vào form với safe access
      const mappedData = {
        name: responseData.name || '',
        author: responseData.author || '',
        size: responseData.size || '',
        description: responseData.description || '',
        version: responseData.version || '',
        icon_url: responseData.icon || '',
        minimum_os_version: responseData.minimumOsVersion || '',
        age_rating: responseData.ageRating || '',
        release_date: responseData.releaseDate ? 
          new Date(responseData.releaseDate).toISOString().split('T')[0] : '',
        supported_devices: Array.isArray(responseData.supportedDevices) ? 
          responseData.supportedDevices.join(', ') : '',
        languages: Array.isArray(responseData.languages) ? 
          responseData.languages.join(', ') : '',
        screenshots: Array.isArray(responseData.screenshots) ? responseData.screenshots : []
};

setForm(prev => ({
  ...prev,
  ...mappedData
}));

if (Array.isArray(responseData.screenshots) && responseData.screenshots.length > 0) {
  setScreenshotInput(responseData.screenshots.join('\n'));
      };

      console.log('[Frontend] Mapped data:', mappedData);

      // Cập nhật form với thông tin đã lấy được
      setForm(prev => ({
        ...prev,
        ...mappedData
      }));

      // Cập nhật screenshots nếu có
      if (responseData.screenshots && Array.isArray(responseData.screenshots) && responseData.screenshots.length > 0) {
  setScreenshotInput(responseData.screenshots.join('\n'));
}

      setAppStoreUrl(""); // Clear URL sau khi thành công
      alert("Đã lấy thông tin thành công từ AppStore!");

    } catch (error) {
      console.error("[Frontend] Error fetching AppStore info:", error);
      
      // Detailed error handling
      let errorMsg = "Lỗi khi lấy thông tin từ AppStore";
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMsg = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.";
      } else if (error.message.includes('JSON')) {
        errorMsg = "Lỗi xử lý dữ liệu từ server.";
      } else if (error.message.includes('405')) {
        errorMsg = "Lỗi cấu hình API. Vui lòng kiểm tra file API route.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setErrorMessage(errorMsg);
    } finally {
      setLoadingAppStoreInfo(false);
    }
  };

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  
   useEffect(() => {
  async function fetchIpaSizeFromPlist() {
    const plistName = form["download_link"]?.trim();
    if (!plistName) return;

    try {
      // Gọi API generate-token (không cần gửi id)
      const tokenResponse = await fetch(`/api/generate-token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ipa_name: plistName }),
});

      if (!tokenResponse.ok) {
        throw new Error(`Lỗi lấy token: ${tokenResponse.status}`);
      }

      const { token } = await tokenResponse.json();
      if (!token) {
        throw new Error("Không nhận được token từ API");
      }

      // Tạo URL gọi plist (không cần installUrl nữa vì đã sai logic)
      const plistUrl = `https://storeios.net/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${token}`;

      const plistResponse = await fetch(plistUrl);
      if (!plistResponse.ok) {
        throw new Error(`Lỗi tải plist: ${plistResponse.status}`);
      }

      const plistContent = await plistResponse.text();
      const ipaUrlMatch = plistContent.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
      
      if (!ipaUrlMatch || !ipaUrlMatch[1]) {
        throw new Error("Không tìm thấy URL IPA trong file plist");
      }
      const ipaUrl = ipaUrlMatch[1];

      const sizeResponse = await fetch(
        `/api/admin/get-size-ipa?url=${encodeURIComponent(ipaUrl)}`
      );
      
      if (!sizeResponse.ok) {
        throw new Error(`Lỗi lấy kích thước: ${sizeResponse.status}`);
      }

      const { size, error: sizeError } = await sizeResponse.json();
      if (sizeError || !size) {
        throw new Error(sizeError || "Không nhận được kích thước");
      }

      setForm(prev => ({
        ...prev,
        size: `${(size / (1024 * 1024)).toFixed(2)} MB`,
      }));

    } catch (error) {
      console.error("Chi tiết lỗi:", { error: error.message, plistName });
      setForm(prev => ({ ...prev, size: `Lỗi: ${error.message}` }));
    }
  }

  const timer = setTimeout(() => {
    if (form["download_link"]) {
      fetchIpaSizeFromPlist();
    }
  }, 500);

  return () => clearTimeout(timer);
}, [form["download_link"]]);


  useEffect(() => {
    if (form.screenshots) {
      setScreenshotInput(form.screenshots.join("\n"));
    }
  }, [form]);

  async function checkAdmin() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return router.push("/login");

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!data || data?.role !== "admin") return router.push("/");
      
      setUser(user);
      await Promise.all([fetchCategories(), fetchApps()]);
    } catch (error) {
      console.error("Admin check error:", error);
      setErrorMessage("Lỗi kiểm tra quyền admin");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*");
      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error("Fetch categories error:", error);
      setErrorMessage("Lỗi tải danh sách chuyên mục");
    }
  }

  async function fetchApps() {
    try {
      const { data, error } = await supabase
        .from("apps")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setApps(data || []);
    } catch (error) {
      console.error("Fetch apps error:", error);
      setErrorMessage("Lỗi tải danh sách ứng dụng");
    }
  }

  function handleEdit(app) {
    if (!isValidUUID(app.category_id)) {
      setErrorMessage("ID chuyên mục không hợp lệ");
      return;
    }
    
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
    setForm(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (!confirm("Xác nhận xoá ứng dụng?")) return;
    
    try {
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
      await fetchApps();
    } catch (error) {
      console.error("Delete app error:", error);
      setErrorMessage("Lỗi khi xoá ứng dụng");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    if (!selectedCategory) {
      setErrorMessage("Vui lòng chọn chuyên mục");
      setSubmitting(false);
      return;
    }

    if (!isValidUUID(selectedCategory)) {
      setErrorMessage("ID chuyên mục không hợp lệ");
      setSubmitting(false);
      return;
    }

    try {
      const screenshots = screenshotInput
        .split(/[\n,]+/)
        .map(url => url.trim())
        .filter(url => url.length > 0 && url.startsWith("http"));

      // Xử lý trường languages: chuyển từ chuỗi thành mảng
      let languagesArray = [];
      if (form.languages) {
        if (typeof form.languages === 'string') {
          // Nếu là chuỗi, tách thành mảng
          languagesArray = form.languages
            .split(/[,\n]+/)
            .map(lang => lang.trim())
            .filter(lang => lang.length > 0);
        } else if (Array.isArray(form.languages)) {
          // Nếu đã là mảng, sử dụng trực tiếp
          languagesArray = form.languages;
        }
      }

      // Xử lý trường supported_devices: chuyển từ chuỗi thành mảng
      let supportedDevicesArray = [];
      if (form.supported_devices) {
        if (typeof form.supported_devices === 'string') {
          supportedDevicesArray = form.supported_devices
            .split(/[,\n]+/)
            .map(device => device.trim())
            .filter(device => device.length > 0);
        } else if (Array.isArray(form.supported_devices)) {
          supportedDevicesArray = form.supported_devices;
        }
      }

      const payload = {
        ...form,
        category_id: selectedCategory,
        screenshots,
        languages: languagesArray,
      supported_devices: supportedDevicesArray, // Sử dụng mảng thay vì chuỗi
        updated_at: new Date().toISOString(),
        slug: form.name ? createSlug(form.name) : uuidv4() // Thêm slug vào payload
      };

      if (editingId) {
        const { error } = await supabase
          .from("apps")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("apps")
          .insert([{ 
            ...payload, 
            id: uuidv4(),
            created_at: new Date().toISOString() 
          }]);
        if (error) throw error;
      }

      alert(editingId ? "Cập nhật thành công!" : "Thêm mới thành công!");
      resetForm();
      await fetchApps();
    } catch (error) {
      console.error("Submit error:", error);
      setErrorMessage(error.message || "Lỗi khi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setForm({});
    setEditingId(null);
    setSelectedCategory("");
    setScreenshotInput("");
    setAppStoreUrl(""); // Reset AppStore URL
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    
    try {
      const payload = {
        name: categoryForm.name,
        fields: categoryForm.fields,
      };

      if (editingCategoryId) {
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ ...payload, id: uuidv4() }]);
        if (error) throw error;
      }

      setCategoryForm({ name: "", fields: [] });
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (error) {
      console.error("Category submit error:", error);
      setErrorMessage(error.message || "Lỗi khi lưu chuyên mục");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      fields: [...category.fields]
    });
    setActiveTab("categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCategory(id) {
    if (!confirm("Xoá chuyên mục sẽ xoá tất cả ứng dụng thuộc chuyên mục này. Xác nhận xoá?")) return;
    
    try {
      await supabase.from("apps").delete().eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
      await Promise.all([fetchCategories(), fetchApps()]);
    } catch (error) {
      console.error("Delete category error:", error);
      setErrorMessage("Lỗi khi xoá chuyên mục");
    }
  }

  function addField() {
    if (!newField.trim()) return;
    setCategoryForm(prev => ({
      ...prev,
      fields: [...prev.fields, newField.trim()]
    }));
    setNewField("");
  }

  function removeField(index) {
    setCategoryForm(prev => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index)
    }));
  }

  const filteredApps = apps.filter(app =>
    app.name?.toLowerCase().includes(search.toLowerCase())
  );

  const currentFields = categories.find(c => c.id === selectedCategory)?.fields || [];

  // Kiểm tra xem có phải chuyên mục TestFlight không
  const isTestFlightCategory = categories.find(c => c.id === selectedCategory)?.name?.toLowerCase().includes('testflight');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p>⏳ Đang tải dữ liệu quản trị...</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform md:relative md:translate-x-0 transition-transform`}
      >
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="md:hidden text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => { setActiveTab("apps"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${
              activeTab === "apps" 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" 
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            📦 Ứng dụng
          </button>
          <button
            onClick={() => { setActiveTab("categories"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${
              activeTab === "categories" 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" 
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            📁 Chuyên mục</button>
          <button
            onClick={() => { setActiveTab("certs"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${activeTab === "certs" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            🛡️ Chứng chỉ
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <span className="ml-2 truncate">{user?.email}</span>
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="ml-auto text-sm text-red-500 hover:underline"
            title="Đăng xuất"
          >
            ↪
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 overflow-auto pb-32">
        {/* Header */}
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              ☰
            </button>
            <h1 className="text-xl md:text-2xl font-bold">
              {activeTab === "apps" ? "Quản lý Ứng dụng" : activeTab === "categories" ? "Quản lý Chuyên mục" : "Quản lý Chứng chỉ"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </header>

        {/* Error Message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100">
            <div className="flex justify-between items-center">
              <p>{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage("")}
                className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {activeTab === "apps" && activeTab !== "certs" ? (
          <>
            {/* Add App Form */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4">
                {editingId ? "✏️ Sửa ứng dụng" : "➕ Thêm ứng dụng mới"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      setSelectedCategory(newCategory);
                      setForm((prev) => ({ ...prev, category_id: newCategory }));
                      setEditingId(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Chọn chuyên mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Thêm phần lấy thông tin từ AppStore cho chuyên mục TestFlight */}
                {selectedCategory && isTestFlightCategory && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-md font-semibold mb-3 text-blue-800 dark:text-blue-200">
                      🍎 Lấy thông tin từ App Store
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={appStoreUrl}
                        onChange={(e) => setAppStoreUrl(e.target.value)}
                        placeholder="Nhập URL App Store (ví dụ: https://apps.apple.com/us/app/...)"
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loadingAppStoreInfo}
                      />
                      <button
                        type="button"
                        onClick={fetchAppStoreInfo}
                        disabled={loadingAppStoreInfo || !appStoreUrl.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
                      >
                        {loadingAppStoreInfo ? "⏳ Đang lấy..." : "🔄 Get Info"}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Nhập URL App Store để tự động điền thông tin ứng dụng vào các trường bên dưới
                    </p>
                  </div>
                )}

                {selectedCategory && currentFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1">{field}</label>
                    {field.toLowerCase().includes("mô tả") || field.toLowerCase().includes("description") ? (
                      <textarea
                        value={form[field] || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        rows={4}
                      />
                    ) : field.toLowerCase().includes("screenshots") ? (
                      <div>
                        <textarea
                          value={screenshotInput}
                          onChange={(e) => setScreenshotInput(e.target.value)}
                          placeholder="Nhập URL ảnh chụp màn hình, mỗi URL một dòng"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows={4}
                        />
                        <p className="text-xs text-gray-500 mt-1">Mỗi URL một dòng</p>
                      </div>
                    ) : (
                      <input
                        type={field.toLowerCase().includes("date") ? "date" : "text"}
                        value={form[field] || ""}
                        onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </div>
                ))}

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !selectedCategory}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? "⏳ Đang lưu..." : editingId ? "💾 Cập nhật" : "➕ Thêm mới"}
                  </button>
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium"
                    >
                      ❌ Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Apps List */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg md:text-xl font-semibold">📋 Danh sách ứng dụng</h2>
                <input
                  type="text"
                  placeholder="🔍 Tìm kiếm ứng dụng..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">Chuyên mục</th>
                      <th className="text-left p-3 font-medium">Ngày tạo</th>
                      <th className="text-left p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredApps.map((app) => (
                      <tr key={app.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {app.icon_url && (
                              <img src={app.icon_url} alt="" className="w-8 h-8 rounded" />
                            )}
                            <span className="font-medium">{app.name || "Không có tên"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          {categories.find(c => c.id === app.category_id)?.name || "Không xác định"}
                        </td>
                        <td className="p-3">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(app)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(app.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              🗑️ Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredApps.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {search ? "Không tìm thấy ứng dụng nào" : "Chưa có ứng dụng nào"}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeTab === "categories" ? (
          <>
            {/* Add Category Form */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4">
                {editingCategoryId ? "✏️ Sửa chuyên mục" : "➕ Thêm chuyên mục mới"}
              </h2>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên chuyên mục:</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Trường dữ liệu:</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      placeholder="Nhập tên trường mới"
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addField}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      ➕ Thêm
                    </button>
                  </div>
                  <div className="space-y-2">
                    {categoryForm.fields.map((field, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="flex-1">{field}</span>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                        >
                          ❌
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !categoryForm.name.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {submitting ? "⏳ Đang lưu..." : editingCategoryId ? "💾 Cập nhật" : "➕ Thêm mới"}
                  </button>
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ name: "", fields: [] });
                      }}
                      className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium"
                    >
                      ❌ Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Categories List */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-lg md:text-xl font-semibold mb-4">📋 Danh sách chuyên mục</h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">Số trường</th>
                      <th className="text-left p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3">{category.fields?.length || 0} trường</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                            >
                              ✏️ Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                            >
                              🗑️ Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có chuyên mục nào
                  </div>
                )}
              </div>
            </section>
          </>
        ) : activeTab === "certs" ? (
          <>
            {/* Certificate Management */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-lg md:text-xl font-semibold mb-4">🛡️ Quản lý và ký chứng chỉ</h2>
              <CertManagerAndSigner />
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}