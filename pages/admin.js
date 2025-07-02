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
    setCategories(data);
  }

  async function fetchApps() {
    const { data } = await supabase
      .from("apps")
      .select("*")
      .order("created_at", { ascending: false });
    setApps(data);
  }

  function handleEdit(app) {
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
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
      category_id: selectedCategory,
    };

    if (editingId) {
      await supabase.from("apps").update(payload).eq("id", editingId);
    } else {
      await supabase.from("apps").insert([payload]);
    }

    setForm({});
    setEditingId(null);
    setSubmitting(false);
    fetchApps();
  }

  async function handleCreateCategory() {
    const name = prompt("Tên chuyên mục mới?");
    const raw = prompt("Các trường cách nhau bởi dấu phẩy:\nVí dụ: name,author,icon_url");
    if (!name || !raw) return;
    const fields = raw.split(",").map((f) => f.trim());
    await supabase.from("categories").insert([{ name, fields }]);
    fetchCategories();
  }

  const filteredApps = apps.filter((a) =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const currentFields = categories.find((c) => c.id === selectedCategory)?.fields || [];

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
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            📦 Ứng dụng
          </button>
          <button
            onClick={() => {}}
            className="w-full flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            📁 Chuyên mục
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
          <img src="https://placehold.co/40x40 " alt="User Avatar" className="w-8 h-8 rounded-full" />
          <span className="ml-2">{user.email}</span>
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
            <h1 className="text-2xl font-bold">Quản lý Ứng dụng</h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
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
                  setSelectedCategory(parseInt(e.target.value));
                  setForm({});
                  setEditingId(null);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
              >
                <option value="">-- chọn --</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {currentFields.map((field) => (
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
                placeholder="Ví dụ: https://example.com/image1.jpg , https://example.com/image2.jpg "
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
              disabled={submitting}
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
            {filteredApps.map((app) => (
              <div
                key={app.id}
                className="flex justify-between items-center p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div>
                  <strong>{app.name}</strong> • <small>{app.version}</small>
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
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}