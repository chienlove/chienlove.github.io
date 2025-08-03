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

      const payload = {
        ...form,
        category_id: selectedCategory,
        screenshots,
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
              {activeTab === "apps" ? "Quản lý Ứng dụng" : "Quản lý Chuyên mục"}
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

                {selectedCategory && currentFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1">{field}</label>
                    {field.toLowerCase().includes("mô tả") || field.toLowerCase().includes("description") ? (
                      <textarea
                        value={form[field] || ""}
                        onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                        placeholder={`Nhập ${field}`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    ) : (
                      <input
                        type="text"
                        value={form[field] || ""}
                        onChange={(e) => setForm(f => ({ ...f, [field]: e.target.value }))}
                        placeholder={`Nhập ${field}`}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        
                      />
                    )}
                  </div>
                ))}

                {/* Screenshots Field */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ảnh màn hình (mỗi URL một dòng)
                  </label>
                  <textarea
                    value={screenshotInput}
                    onChange={(e) => setScreenshotInput(e.target.value)}
                    placeholder="https://example.com/image1.jpg\nhttps://example.com/image2.jpg"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Có thể nhập nhiều URL, mỗi URL một dòng hoặc cách nhau bằng dấu phẩy
                  </p>
                </div>

                {screenshotInput && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-4">
                    {screenshotInput
                      .split(/[\n,]+/)
                      .map(url => url.trim())
                      .filter(url => url.startsWith("http"))
                      .map((url, i) => (
                        <div key={i} className="relative group">
                          <img 
                            src={url} 
                            alt={`Screenshot ${i}`} 
                            className="w-full h-32 object-cover rounded border border-gray-200 dark:border-gray-700"
                            onError={(e) => {
                              e.target.src = "https://placehold.co/300x200?text=Ảnh+không+tồn+tại";
                              e.target.className = "w-full h-32 object-contain rounded border border-gray-200 dark:border-gray-700 p-2 bg-gray-100";
                            }}
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                            {url.length > 30 ? url.substring(0, 30) + "..." : url}
                          </div>
                        </div>
                      ))}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !selectedCategory}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">↻</span>
                        Đang lưu...
                      </span>
                    ) : editingId ? (
                      "Cập nhật"
                    ) : (
                      "Thêm ứng dụng"
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Apps List */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg md:text-xl font-semibold">Danh sách ứng dụng</h2>
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span>🔍</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Tìm theo tên..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                {filteredApps.length > 0 ? (
                  filteredApps.map((app) => {
                    const category = categories.find(c => c.id === app.category_id);
                    return (
                      <div
                        key={app.id}
                        className="flex justify-between items-center p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{app.name}</h3>
                          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                            {category && (
                              <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs mr-2 dark:bg-blue-900 dark:text-blue-200">
                                {category.name}
                              </span>
                            )}
                            {app.version && <span>Phiên bản: {app.version}</span>}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(app)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDelete(app.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    {search ? "Không tìm thấy ứng dụng phù hợp" : "Chưa có ứng dụng nào"}
                  </div>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Category Management */}
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
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    placeholder="Nhập tên chuyên mục"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Các trường:</label>
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
                      Thêm
                    </button>
                  </div>
                  
                  {categoryForm.fields.length > 0 && (
                    <div className="space-y-2">
                      {categoryForm.fields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm">
                            {field}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            title="Xóa trường này"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ name: "", fields: [] });
                      }}
                      className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700"
                    >
                      Hủy
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={submitting || !categoryForm.name || categoryForm.fields.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    {submitting ? (
                      <span className="flex items-center">
                        <span className="animate-spin mr-2">↻</span>
                        Đang lưu...
                      </span>
                    ) : editingCategoryId ? (
                      "Cập nhật"
                    ) : (
                      "Thêm chuyên mục"
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Categories List */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-lg md:text-xl font-semibold mb-4">Danh sách chuyên mục</h2>
              
              <div className="space-y-3">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="p-3 border rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{category.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {category.fields.map((field, i) => (
                              <span 
                                key={i} 
                                className="inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded-full text-xs"
                              >
                                {field}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditCategory(category)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Sửa"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(category.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Xóa"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    Chưa có chuyên mục nào
                  </div>
                )}
              </div>
            </section>
          </>
          )}
        {activeTab === "certs" && (
          <section className="max-w-xl mx-auto">
            <CertManagerAndSigner />
          </section>
)}
      </main>
    </div>
  );
}