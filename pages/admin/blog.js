// pages/admin/blog.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faExclamationTriangle,
  faSave,
  faPlus,
  faEdit,
  faTrash,
  faMoon,
  faSun,
  faArrowLeft,
  faEye,
} from "@fortawesome/free-solid-svg-icons";

function createSlug(text = "") {
  return text
    .toString()
    .toLowerCase()
    .trim()
    // bỏ ký tự đặc biệt
    .replace(/[^\w\s-]/g, "")
    // thay khoảng trắng = dấu -
    .replace(/\s+/g, "-");
}

export default function AdminBlog() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    excerpt: "",
    content: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // pagination đơn giản
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ----- AUTH -----
  useEffect(() => {
    async function checkAdmin() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          router.push("/login");
          return;
        }
        const user = data.user;
        const { data: userRow } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .single();
        if (!userRow || userRow.role !== "admin") {
          router.push("/");
          return;
        }
        setUser(user);
      } catch (err) {
        console.error("Auth error:", err);
        setError("Lỗi kiểm tra quyền admin.");
      } finally {
        setCheckingAuth(false);
      }
    }
    checkAdmin();
  }, [router]);

  // dark mode
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // load posts
  useEffect(() => {
    if (!user) return;
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchPosts() {
    try {
      setLoadingPosts(true);
      setError("");
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
      setPage(1);
    } catch (err) {
      console.error("Fetch posts error:", err);
      setError(err.message || "Lỗi tải danh sách bài viết.");
    } finally {
      setLoadingPosts(false);
    }
  }

  // ----- FORM -----
  function handleChange(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleTitleChange(value) {
    const slugFromTitle = createSlug(value);
    setForm((prev) => ({
      ...prev,
      title: value,
      slug: prev.editSlugManually ? prev.slug : slugFromTitle,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề.");
      return;
    }
    if (!form.slug.trim()) {
      setError("Slug không được để trống.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content.trim(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("blog_posts")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert([payload]);
        if (error) throw error;
      }

      await fetchPosts();
      resetForm();
    } catch (err) {
      console.error("Save post error:", err);
      setError(err.message || "Lỗi khi lưu bài viết.");
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEditingId(null);
    setForm({
      title: "",
      slug: "",
      excerpt: "",
      content: "",
    });
  }

  function handleEdit(post) {
    setEditingId(post.id);
    setForm({
      title: post.title || "",
      slug: post.slug || "",
      excerpt: post.excerpt || "",
      content: post.content || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(post) {
    if (!window.confirm(`Xoá bài "${post.title}"? Hành động này không thể hoàn tác.`)) return;
    try {
      const { error } = await supabase.from("blog_posts").delete().eq("id", post.id);
      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error("Delete post error:", err);
      setError(err.message || "Lỗi xoá bài viết.");
    }
  }

  // ----- FILTER & PAGINATION -----
  const filteredPosts = posts.filter((p) => {
    const s = search.trim().toLowerCase();
    if (!s) return true;
    return (
      p.title?.toLowerCase().includes(s) ||
      p.slug?.toLowerCase().includes(s) ||
      p.excerpt?.toLowerCase().includes(s)
    );
  });

  const total = filteredPosts.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredPosts.slice(start, start + pageSize);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
        Đang kiểm tra quyền admin...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-gray-800"
      }`}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <FontAwesomeIcon icon={faArrowLeft} />{" "}
            <span className="hidden sm:inline ml-1">Quay lại Admin</span>
          </button>
          <h1 className="text-lg md:text-2xl font-bold">
            Quản lý Blog
            <span className="ml-2 text-xs font-normal opacity-70">({total} bài viết)</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-xs opacity-70 truncate max-w-[160px]">
            {user.email}
          </span>
          <button
            onClick={() => setDarkMode((v) => !v)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 md:px-8 py-6 space-y-6">
        {error && (
          <div className="p-3 rounded-md bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100">
            <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
            {error}
          </div>
        )}

        {/* Form */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
            {editingId ? "Sửa bài viết" : "Thêm bài viết mới"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Nhập tiêu đề bài viết..."
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Slug (URL) <span className="opacity-70 text-xs">(tự tạo từ tiêu đề, có thể chỉnh)</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => handleChange("slug", createSlug(e.target.value))}
                className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="vd: huong-dan-cai-app-testflight"
                required
              />
              {form.slug && (
                <p className="text-xs text-gray-500 mt-1">
                  URL xem bài viết: <code>/blog/{form.slug}</code>
                </p>
              )}
            </div>

            {/* Excerpt */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tóm tắt (Excerpt){" "}
                <span className="opacity-70 text-xs">(hiển thị ở trang danh sách blog, nên viết 1–2 câu)</span>
              </label>
              <textarea
                rows={2}
                value={form.excerpt}
                onChange={(e) => handleChange("excerpt", e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tóm tắt ngắn nội dung chính của bài viết..."
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Nội dung bài viết{" "}
                <span className="opacity-70 text-xs">(hỗ trợ text / markdown, nên viết dài ≥ 800 từ)</span>
              </label>
              <textarea
                rows={14}
                value={form.content}
                onChange={(e) => handleChange("content", e.target.value)}
                className="w-full px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="Viết nội dung bài blog ở đây..."
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className={`px-4 py-2 text-sm font-semibold rounded text-white flex items-center gap-2 ${
                  editingId
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-blue-600 hover:bg-blue-700"
                } disabled:bg-gray-400 disabled:cursor-not-allowed`}
              >
                {saving ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin /> Đang lưu...
                  </>
                ) : editingId ? (
                  <>
                    <FontAwesomeIcon icon={faSave} /> Cập nhật bài viết
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} /> Lưu bài mới
                  </>
                )}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm font-semibold rounded bg-red-500 text-white hover:bg-red-600"
                >
                  Hủy chỉnh sửa
                </button>
              )}
            </div>
          </form>
        </section>

        {/* LIST POSTS */}
        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <h2 className="text-lg md:text-xl font-semibold">
              Danh sách bài viết{" "}
              <span className="text-xs font-normal opacity-70">
                ({total} bài)
              </span>
            </h2>

            <div className="flex items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Tìm theo tiêu đề / slug..."
                className="w-full md:w-64 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {loadingPosts ? (
            <div className="flex items-center justify-center py-8 text-gray-500">
              <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
              Đang tải danh sách bài viết...
            </div>
          ) : pageItems.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              {search ? "Không tìm thấy bài viết nào phù hợp." : "Chưa có bài viết nào."}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 text-sm font-medium">Tiêu đề</th>
                      <th className="text-left p-3 text-sm font-medium">Slug</th>
                      <th className="text-left p-3 text-sm font-medium">Ngày tạo</th>
                      <th className="text-left p-3 text-sm font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((post) => (
                      <tr
                        key={post.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                      >
                        <td className="p-3">
                          <div className="font-semibold text-gray-900 dark:text-gray-50">
                            {post.title}
                          </div>
                          {post.excerpt && (
                            <div className="text-xs text-gray-500 mt-1 line-clamp-1">
                              {post.excerpt}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                          {post.slug}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                          {post.created_at
                            ? new Date(post.created_at).toLocaleString("vi-VN")
                            : "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                window.open(`/blog/${post.slug}`, "_blank")
                              }
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEye} /> Xem
                            </button>
                            <button
                              onClick={() => handleEdit(post)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEdit} /> Sửa
                            </button>
                            <button
                              onClick={() => handleDelete(post)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faTrash} /> Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <ul className="md:hidden space-y-3">
                {pageItems.map((post) => (
                  <li
                    key={post.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-white dark:bg-gray-800"
                  >
                    <div className="font-semibold text-gray-900 dark:text-gray-50">
                      {post.title}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Slug: {post.slug}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {post.created_at
                        ? new Date(post.created_at).toLocaleString("vi-VN")
                        : "-"}
                    </div>
                    <div className="mt-2 flex items-center justify-end gap-2 text-sm">
                      <button
                        onClick={() =>
                          window.open(`/blog/${post.slug}`, "_blank")
                        }
                        className="p-2 text-green-500 hover:text-green-600"
                        aria-label="Xem bài trên website"
                      >
                        <FontAwesomeIcon icon={faEye} />
                      </button>
                      <button
                        onClick={() => handleEdit(post)}
                        className="p-2 text-yellow-500 hover:text-yellow-600"
                        aria-label="Sửa bài"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(post)}
                        className="p-2 text-red-500 hover:text-red-600"
                        aria-label="Xoá bài"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  >
                    « Trước
                  </button>
                  <span>
                    Trang <b>{currentPage}</b> / <b>{totalPages}</b>
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  >
                    Tiếp »
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}