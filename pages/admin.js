import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabase";

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
  const [activeTab, setActiveTab] = useState("apps"); // 'apps' or 'categories'
  const [categoryForm, setCategoryForm] = useState({ name: "", fields: [] });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newField, setNewField] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const { data, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || data?.role !== "admin") return router.push("/");
    setUser(user);
    await fetchCategories();
    await fetchApps();
    setLoading(false);
  }

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("*");
    setCategories(data || []);
  }

  async function fetchApps() {
    const { data } = await supabase
      .from("apps")
      .select("*")
      .order("created_at", { ascending: false });
    setApps(data || []);
  }

  function handleEdit(app) {
    setEditingId(app.id);
    setSelectedCategory(app.category_id.toString()); // Chuyển sang string để select hoạt động
    setForm(app);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    if (confirm("Xác nhận xoá ứng dụng?")) {
      await supabase.from("apps").delete().eq("id", id);
      fetchApps();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      category_id: parseInt(selectedCategory), // Chuyển sang number trước khi lưu
    };

    try {
      if (editingId) {
        await supabase.from("apps").update(payload).eq("id", editingId);
      } else {
        await supabase.from("apps").insert([payload]);
      }
      setForm({});
      setEditingId(null);
      fetchApps();
    } catch (error) {
      console.error("Error saving app:", error);
      alert("Có lỗi xảy ra khi lưu ứng dụng");
    } finally {
      setSubmitting(false);
    }
  }

  // ===== Category Management Functions =====
  async function handleCategorySubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    
    const payload = {
      name: categoryForm.name,
      fields: categoryForm.fields,
    };

    try {
      if (editingCategoryId) {
        await supabase.from("categories").update(payload).eq("id", editingCategoryId);
      } else {
        await supabase.from("categories").insert([payload]);
      }
      setCategoryForm({ name: "", fields: [] });
      setEditingCategoryId(null);
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      alert("Có lỗi xảy ra khi lưu chuyên mục");
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
      // Xoá tất cả apps thuộc category này trước
      await supabase.from("apps").delete().eq("category_id", id);
      // Sau đó xoá category
      await supabase.from("categories").delete().eq("id", id);
      fetchCategories();
      fetchApps();
    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Có lỗi xảy ra khi xoá chuyên mục");
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

  const filteredApps = apps.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const currentFields = categories.find((c) => c.id.toString() === selectedCategory)?.fields || [];

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
          <button onClick={() => setSidebarOpen(false)} className="md:hidden">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab("apps")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded ${activeTab === "apps" ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            📦 Ứng dụng
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`w-full flex items-center gap-3 px-4 py-2 rounded ${activeTab === "categories" ? "bg-gray-200 dark:bg-gray-700" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}
          >
            📁 Chuyên mục
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
          <img src="https://placehold.co/40x40" alt="User Avatar" className="w-8 h-8 rounded-full" />
          <span className="ml-2">{user?.email}</span>
          <button 
            onClick={handleLogout}
            className="ml-auto text-sm text-red-500 hover:underline"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">
              {activeTab === "apps" ? "Quản lý Ứng dụng" : "Quản lý Chuyên mục"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              )}
            </button>
          </div>
        </header>

        {activeTab === "apps" ? (
          <>
            {/* Add App Form */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? "Sửa ứng dụng" : "Thêm ứng dụng mới"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setForm({});
                      setEditingId(null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    required
                  >
                    <option value="">-- chọn --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory && currentFields.map((field) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1">{field}</label>
                    <input
                      type="text"
                      value={form[field] || ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [field]: e.target.value }))
                      }
                      placeholder={`Nhập ${field}`}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                      required
                    />
                  </div>
                ))}

                {/* Field: Screenshots */}
                <div>
                  <label className="block text-sm font-medium mb-1">Ảnh màn hình (dán link, cách nhau bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={form.screenshots?.join(",") || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        screenshots: e.target.value
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="Ví dụ: https://example.com/image1.jpg, https://example.com/image2.jpg"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                </div>

                {form.screenshots?.length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {form.screenshots.map((url, i) => (
                      <img key={i} src={url} alt={`Screenshot ${i}`} className="w-full rounded" />
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedCategory}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {submitting ? "Đang lưu..." : editingId ? "Cập nhật" : "Thêm ứng dụng"}
                </button>
              </form>
            </section>

            {/* Apps List */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Danh sách ứng dụng</h2>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Tìm theo tên..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
              </div>
              <div className="space-y-3">
                {filteredApps.length > 0 ? (
                  filteredApps.map((app) => (
                    <div
                      key={app.id}
                      className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div>
                        <strong>{app.name}</strong> • 
                        <small className="ml-2">{categories.find(c => c.id === app.category_id)?.name}</small>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEdit(app)}
                          className="text-blue-500 hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDelete(app.id)}
                          className="text-red-500 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-gray-500">Không có ứng dụng nào</p>
                )}
              </div>
            </section>
          </>
        ) : (
          <>
            {/* Category Management Form */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {editingCategoryId ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}
              </h2>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên chuyên mục:</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})}
                    placeholder="Nhập tên chuyên mục"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
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
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <button
                      type="button"
                      onClick={addField}
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Thêm
                    </button>
                  </div>
                  
                  {categoryForm.fields.length > 0 && (
                    <div className="space-y-2">
                      {categoryForm.fields.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                            {field}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeField(index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !categoryForm.name || categoryForm.fields.length === 0}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
                >
                  {submitting ? "Đang lưu..." : editingCategoryId ? "Cập nhật" : "Thêm chuyên mục"}
                </button>
              </form>
            </section>

            {/* Categories List */}
            <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Danh sách chuyên mục</h2>
              <div className="space-y-3">
                {categories.length > 0 ? (
                  categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <div>
                        <strong>{category.name}</strong>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {category.fields.map((field, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                              {field}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-500 hover:underline"
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-500 hover:underline"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-gray-500">Không có chuyên mục nào</p>
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}