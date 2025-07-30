import { useEffect, useState } from "react";
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

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    async function fetchIpaSizeFromPlist() {
      const link = form["download_link"];
      if (!link || !link.startsWith("itms-services://")) {
        console.log("Không phải link itms-services, bỏ qua.");
        return;
      }

      try {
        const url = decodeURIComponent(link.split("url=")[1]);
        console.log("Đang tải plist từ:", url);
        const response = await fetch(url);
        const text = await response.text();

        const ipaUrlMatch = text.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/);
        if (!ipaUrlMatch) {
          console.warn("Không tìm thấy đường dẫn IPA trong plist:\n", text);
          return;
        }

        const ipaUrl = ipaUrlMatch[1];
        console.log("Tìm thấy IPA URL:", ipaUrl);

        const apiURL = `https://storeios.net/api/admin/get-size-ipa?url=${encodeURIComponent(ipaUrl)}`;
        const proxyResp = await fetch(apiURL);
        const result = await proxyResp.json();

        if (result.size) {
          const sizeMB = (parseInt(result.size) / (1024 * 1024)).toFixed(2);
          console.log("Kích thước IPA:", sizeMB, "MB");
          setForm(prev => ({ ...prev, size: sizeMB }));
        } else {
          console.warn("Không lấy được size từ API:", result.error || result);
        }
      } catch (err) {
        console.warn("Không lấy được size IPA:", err);
      }
    }

    fetchIpaSizeFromPlist();
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

      const payload = {
        ...form,
        category_id: selectedCategory,
        screenshots,
        updated_at: new Date().toISOString(),
        slug: form.name ? createSlug(form.name) : uuidv4()
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-300 font-medium">Đang tải dữ liệu quản trị...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-all duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gradient-to-br from-slate-50 to-blue-50 text-gray-800"}`}>
      
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-gray-800 shadow-2xl transform md:relative md:translate-x-0 transition-all duration-300 border-r border-gray-200 dark:border-gray-700`}>
        
        {/* Sidebar Header */}
        <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <i className="fas fa-shield-alt text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Panel</h2>
                <p className="text-blue-100 text-sm">Quản trị hệ thống</p>
              </div>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)} 
              className="md:hidden text-white/80 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-6 space-y-2">
          <button
            onClick={() => { setActiveTab("apps"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "apps" 
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg transform scale-105" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === "apps" ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"}`}>
              <i className={`fas fa-mobile-alt ${activeTab === "apps" ? "text-white" : "text-gray-600 dark:text-gray-300"}`}></i>
            </div>
            <span>Ứng dụng</span>
          </button>

          <button
            onClick={() => { setActiveTab("categories"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "categories" 
                ? "bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg transform scale-105" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === "categories" ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"}`}>
              <i className={`fas fa-folder-open ${activeTab === "categories" ? "text-white" : "text-gray-600 dark:text-gray-300"}`}></i>
            </div>
            <span>Chuyên mục</span>
          </button>

          <button
            onClick={() => { setActiveTab("certs"); setSidebarOpen(false); }}
            className={`w-full text-left flex items-center gap-4 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
              activeTab === "certs" 
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transform scale-105" 
                : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            }`}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeTab === "certs" ? "bg-white/20" : "bg-gray-200 dark:bg-gray-600"}`}>
              <i className={`fas fa-certificate ${activeTab === "certs" ? "text-white" : "text-gray-600 dark:text-gray-300"}`}></i>
            </div>
            <span>Chứng chỉ</span>
          </button>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user?.email}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Quản trị viên</p>
            </div>
            <button 
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/login");
              }}
              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Đăng xuất"
            >
              <i className="fas fa-sign-out-alt"></i>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                >
                  <i className="fas fa-bars text-gray-600 dark:text-gray-300"></i>
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeTab === "apps" ? "Quản lý Ứng dụng" : 
                     activeTab === "categories" ? "Quản lý Chuyên mục" : "Quản lý Chứng chỉ"}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {activeTab === "apps" ? `${apps.length} ứng dụng` : 
                     activeTab === "categories" ? `${categories.length} chuyên mục` : "Quản lý chứng chỉ ký IPA"}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {activeTab === "apps" && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Tìm kiếm ứng dụng..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    />
                    <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                  </div>
                )}
                
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                  title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
                >
                  <i className={`fas ${darkMode ? "fa-sun" : "fa-moon"} text-gray-600 dark:text-gray-300`}></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-6 space-y-6">
          
          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex justify-between items-start">
                <div className="flex items-start">
                  <i className="fas fa-exclamation-triangle text-red-500 mt-0.5 mr-3"></i>
                  <div>
                    <h4 className="text-red-800 dark:text-red-200 font-medium">Có lỗi xảy ra</h4>
                    <p className="text-red-700 dark:text-red-300 text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setErrorMessage("")}
                  className="text-red-500 hover:text-red-700 p-1 rounded transition-all"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
          )}

          {/* Apps Tab */}
          {activeTab === "apps" && (
            <>
              {/* Add/Edit App Form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <i className={`fas ${editingId ? "fa-edit" : "fa-plus"} text-xl mr-3`}></i>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {editingId ? "Chỉnh sửa ứng dụng" : "Thêm ứng dụng mới"}
                      </h3>
                      <p className="text-blue-100 text-sm">
                        {editingId ? "Cập nhật thông tin ứng dụng" : "Tạo ứng dụng mới trong hệ thống"}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  {/* Category Selection */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <i className="fas fa-folder mr-2 text-blue-500"></i>
                      Chuyên mục
                    </label>
                    <div className="relative">
                      <select
                        value={selectedCategory}
                        onChange={(e) => {
                          const newCategory = e.target.value;
                          setSelectedCategory(newCategory);
                          setForm((prev) => ({ ...prev, category_id: newCategory }));
                          setEditingId(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all appearance-none"
                        required
                      >
                        <option value="">-- Chọn chuyên mục --</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                    </div>
                  </div>

                  {/* Dynamic Fields */}
                  {selectedCategory && currentFields.map((field) => (
                    <div key={field} className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <i className={`fas ${field.toLowerCase().includes('mô tả') || field.toLowerCase().includes('description') ? 'fa-align-left' : 'fa-tag'} mr-2 text-green-500`}></i>
                        {field}
                      </label>
                      {field.toLowerCase().includes("mô tả") || field.toLowerCase().includes("description") ? (
                        <textarea
                          value={form[field] || ""}
                          onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                          placeholder={`Nhập ${field.toLowerCase()}`}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[120px] focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                          required
                        />
                      ) : (
                        <input
                          type="text"
                          value={form[field] || ""}
                          onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                          placeholder={`Nhập ${field.toLowerCase()}`}
                          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                          required
                        />
                      )}
                    </div>
                  ))}

                  {/* Screenshots */}
                  {selectedCategory && (
                    <div className="space-y-2">
                      <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                        <i className="fas fa-images mr-2 text-purple-500"></i>
                        Screenshots (mỗi URL một dòng)
                      </label>
                      <textarea
                        value={screenshotInput}
                        onChange={(e) => setScreenshotInput(e.target.value)}
                        placeholder="https://example.com/screenshot1.jpg&#10;https://example.com/screenshot2.jpg"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[100px] focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <i className="fas fa-info-circle mr-1"></i>
                        Nhập mỗi URL screenshot trên một dòng riêng biệt
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={submitting || !selectedCategory}
                      className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        submitting || !selectedCategory
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105 shadow-lg hover:shadow-xl'
                      } text-white`}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className={`fas ${editingId ? "fa-save" : "fa-plus"} mr-2`}></i>
                          {editingId ? "Cập nhật" : "Thêm mới"}
                        </>
                      )}
                    </button>
                    
                    {editingId && (
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-200 flex items-center justify-center"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Apps List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center">
                      <i className="fas fa-list text-xl mr-3"></i>
                      <div>
                        <h3 className="text-xl font-semibold">Danh sách ứng dụng</h3>
                        <p className="text-green-100 text-sm">{filteredApps.length} ứng dụng được tìm thấy</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  {filteredApps.length === 0 ? (
                    <div className="p-12 text-center">
                      <i className="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-500 dark:text-gray-400 text-lg">Không có ứng dụng nào</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Thêm ứng dụng đầu tiên để bắt đầu</p>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ứng dụng</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Chuyên mục</th>
                          <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ngày tạo</th>
                          <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredApps.map((app) => {
                          const category = categories.find(c => c.id === app.category_id);
                          return (
                            <tr key={app.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-semibold">
                                    {app.name?.charAt(0).toUpperCase() || "?"}
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{app.name || "Không có tên"}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{app.version || "Không có phiên bản"}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  <i className="fas fa-folder mr-1"></i>
                                  {category?.name || "Không xác định"}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                                {app.created_at ? new Date(app.created_at).toLocaleDateString('vi-VN') : "Không xác định"}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button
                                  onClick={() => handleEdit(app)}
                                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all"
                                >
                                  <i className="fas fa-edit mr-1"></i>
                                  Sửa
                                </button>
                                <button
                                  onClick={() => handleDelete(app.id)}
                                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all"
                                >
                                  <i className="fas fa-trash mr-1"></i>
                                  Xóa
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Categories Tab */}
          {activeTab === "categories" && (
            <>
              {/* Add/Edit Category Form */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-teal-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <i className={`fas ${editingCategoryId ? "fa-edit" : "fa-plus"} text-xl mr-3`}></i>
                    <div>
                      <h3 className="text-xl font-semibold">
                        {editingCategoryId ? "Chỉnh sửa chuyên mục" : "Thêm chuyên mục mới"}
                      </h3>
                      <p className="text-green-100 text-sm">
                        {editingCategoryId ? "Cập nhật thông tin chuyên mục" : "Tạo chuyên mục mới cho ứng dụng"}
                      </p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleCategorySubmit} className="p-6 space-y-6">
                  {/* Category Name */}
                  <div className="space-y-2">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <i className="fas fa-tag mr-2 text-green-500"></i>
                      Tên chuyên mục
                    </label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nhập tên chuyên mục"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                      required
                    />
                  </div>

                  {/* Fields Management */}
                  <div className="space-y-4">
                    <label className="flex items-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <i className="fas fa-list mr-2 text-blue-500"></i>
                      Các trường dữ liệu
                    </label>
                    
                    {/* Add New Field */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newField}
                        onChange={(e) => setNewField(e.target.value)}
                        placeholder="Nhập tên trường mới"
                        className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addField())}
                      />
                      <button
                        type="button"
                        onClick={addField}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center"
                      >
                        <i className="fas fa-plus"></i>
                      </button>
                    </div>

                    {/* Fields List */}
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {categoryForm.fields.map((field, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center">
                            <i className="fas fa-grip-vertical text-gray-400 mr-3"></i>
                            <span className="text-gray-900 dark:text-white font-medium">{field}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="text-red-500 hover:text-red-700 p-1 rounded transition-all"
                          >
                            <i className="fas fa-times"></i>
                          </button>
                        </div>
                      ))}
                      {categoryForm.fields.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <i className="fas fa-inbox text-2xl mb-2"></i>
                          <p>Chưa có trường nào được thêm</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="submit"
                      disabled={submitting || !categoryForm.name.trim()}
                      className={`flex-1 flex items-center justify-center px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${
                        submitting || !categoryForm.name.trim()
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 hover:scale-105 shadow-lg hover:shadow-xl'
                      } text-white`}
                    >
                      {submitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <i className={`fas ${editingCategoryId ? "fa-save" : "fa-plus"} mr-2`}></i>
                          {editingCategoryId ? "Cập nhật" : "Thêm mới"}
                        </>
                      )}
                    </button>
                    
                    {editingCategoryId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategoryId(null);
                          setCategoryForm({ name: "", fields: [] });
                        }}
                        className="px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold transition-all duration-200 flex items-center justify-center"
                      >
                        <i className="fas fa-times mr-2"></i>
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Categories List */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <i className="fas fa-folder-open text-xl mr-3"></i>
                    <div>
                      <h3 className="text-xl font-semibold">Danh sách chuyên mục</h3>
                      <p className="text-purple-100 text-sm">{categories.length} chuyên mục được tạo</p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {categories.length === 0 ? (
                    <div className="text-center py-12">
                      <i className="fas fa-folder-plus text-4xl text-gray-400 mb-4"></i>
                      <p className="text-gray-500 dark:text-gray-400 text-lg">Chưa có chuyên mục nào</p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">Tạo chuyên mục đầu tiên để phân loại ứng dụng</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {categories.map((category) => (
                        <div key={category.id} className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center text-white font-semibold mr-3">
                                {category.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-semibold text-gray-900 dark:text-white">{category.name}</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{category.fields?.length || 0} trường</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            {category.fields?.slice(0, 3).map((field, index) => (
                              <div key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                                <i className="fas fa-tag text-xs text-gray-400 mr-2"></i>
                                {field}
                              </div>
                            ))}
                            {category.fields?.length > 3 && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                +{category.fields.length - 3} trường khác
                              </p>
                            )}
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all"
                            >
                              <i className="fas fa-edit mr-1"></i>
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="flex-1 flex items-center justify-center px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all"
                            >
                              <i className="fas fa-trash mr-1"></i>
                              Xóa
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Certificates Tab */}
          {activeTab === "certs" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <i className="fas fa-certificate text-xl mr-3"></i>
                    <div>
                      <h3 className="text-xl font-semibold">Quản lý Chứng chỉ</h3>
                      <p className="text-orange-100 text-sm">Upload và quản lý chứng chỉ ký IPA</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <CertUploader />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                  <div className="flex items-center text-white">
                    <i className="fas fa-tools text-xl mr-3"></i>
                    <div>
                      <h3 className="text-xl font-semibold">Công cụ Ký IPA</h3>
                      <p className="text-indigo-100 text-sm">Quản lý và sử dụng chứng chỉ để ký IPA</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <CertManagerAndSigner />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

