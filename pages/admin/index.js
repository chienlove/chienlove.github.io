// pages/admin/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import CertManagerAndSigner from "../../components/admin/CertManagerAndSigner";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faEdit, faTrash, faSave, faTimes, faSync, faSpinner,
  faBoxOpen, faFolder, faShieldAlt, faSun, faMoon, faBars,
  faSignOutAlt, faSearch, faExclamationTriangle, faChevronLeft,
  faChevronRight, faCheckSquare, faSquare, faCopy, faEye, faArrowUpRightFromSquare
} from "@fortawesome/free-solid-svg-icons";
import { faApple } from "@fortawesome/free-brands-svg-icons";

/* ===== Quick View (xem nhanh bài viết) ===== */
function QuickViewModal({ open, onClose, app, categories, htmlDesc }) {
  if (!open || !app) return null;
  const catName = categories.find(c => c.id === app.category_id)?.name || "Không xác định";
  const publicHref = app.slug ? `/${app.slug}` : null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 p-3">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-auto rounded-xl shadow-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            {app.icon_url ? <img src={app.icon_url} alt="" className="w-8 h-8 rounded" /> : null}
            <div>
              <div className="font-semibold">{app.name || "Không có tên"}</div>
              <div className="text-xs opacity-70">
                {catName} • {app.created_at ? new Date(app.created_at).toLocaleString("vi-VN") : "N/A"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {publicHref && (
              <a
                href={publicHref}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-sm flex items-center gap-2"
                title="Mở ngoài trang công khai"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                Mở ngoài trang
              </a>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
            >
              <FontAwesomeIcon icon={faTimes} /> Đóng
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {htmlDesc?.trim() ? (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: htmlDesc }}
            />
          ) : (
            <div className="text-sm opacity-70 italic">Chưa có mô tả.</div>
          )}

          {Array.isArray(app.screenshots) && app.screenshots.length > 0 ? (
            <div>
              <div className="text-sm font-medium mb-2 opacity-80">Ảnh chụp màn hình</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {app.screenshots.map((u, i) => (
                  <img key={i} src={u} alt="" className="w-full h-auto rounded border border-gray-200 dark:border-gray-700" />
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {app.version ? <div><span className="opacity-70">Version:</span> <b>{app.version}</b></div> : null}
            {app.size ? <div><span className="opacity-70">Kích thước:</span> <b>{app.size}</b></div> : null}
            {Array.isArray(app.languages) && app.languages.length ? (
              <div><span className="opacity-70">Ngôn ngữ:</span> <b>{app.languages.join(", ")}</b></div>
            ) : null}
            {Array.isArray(app.supported_devices) && app.supported_devices.length ? (
              <div><span className="opacity-70">Thiết bị hỗ trợ:</span> <b>{app.supported_devices.join(", ")}</b></div>
            ) : null}
            {app.minimum_os_version ? (
              <div><span className="opacity-70">Yêu cầu iOS:</span> <b>{app.minimum_os_version}</b></div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Markdown/BBCode (link-safe, không dùng regex literal cho link) ===== */
function mdToHtml(src = "") {
  // cơ bản: heading, bold, italic, code
  let s = src
    .replace(/^###### (.*)$/gm, "<h6>$1</h6>")
    .replace(/^##### (.*)$/gm, "<h5>$1</h5>")
    .replace(/^#### (.*)$/gm, "<h4>$1</h4>")
    .replace(/^### (.*)$/gm, "<h3>$1</h3>")
    .replace(/^## (.*)$/gm, "<h2>$1</h2>")
    .replace(/^# (.*)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+?)`/g, "<code>$1</code>");

  s = replaceMarkdownLinksSafely(s);
  s = s.replace(/\n/g, "<br/>");
  return s;
}

function replaceMarkdownLinksSafely(input) {
  // Parser nhỏ tìm [text](http|https)
  let out = "";
  let i = 0;
  while (i < input.length) {
    const lb = input.indexOf("[", i);
    if (lb === -1) { out += input.slice(i); break; }
    const rb = input.indexOf("]", lb + 1);
    if (rb === -1) { out += input.slice(i); break; }
    const lp = input.indexOf("(", rb + 1);
    if (lp !== rb + 1) { out += input.slice(i, lb + 1); i = lb + 1; continue; }
    const rp = input.indexOf(")", lp + 1);
    if (rp === -1) { out += input.slice(i); break; }

    const text = input.slice(lb + 1, rb);
    const url = input.slice(lp + 1, rp);
    const isHttp = url.startsWith("http://") || url.startsWith("https://");

    out += input.slice(i, lb);
    if (isHttp) {
      const escText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const escUrl = url.replace(/"/g, "&quot;");
      out += `<a href="${escUrl}" target="_blank" rel="noopener noreferrer">${escText}</a>`;
    } else {
      out += input.slice(lb, rp + 1);
    }
    i = rp + 1;
  }
  return out;
}

function bbcodeToHtml(src = "") {
  let s = src;
  s = s.replace(new RegExp("\$begin:math:display$b\\$end:math:display$(.*?)\$begin:math:display$/b\\$end:math:display$", "gis"), "<strong>$1</strong>");
  s = s.replace(new RegExp("\$begin:math:display$i\\$end:math:display$(.*?)\$begin:math:display$/i\\$end:math:display$", "gis"), "<em>$1</em>");
  s = s.replace(new RegExp("\$begin:math:display$u\\$end:math:display$(.*?)\$begin:math:display$/u\\$end:math:display$", "gis"), "<u>$1</u>");
  s = s.replace(new RegExp("\$begin:math:display$url=(https?:\\\\/\\\\/[^\\$end:math:display$]+)\\](.*?)\$begin:math:display$\\\\/url\\$end:math:display$", "gis"),
    '<a href="$1" target="_blank" rel="noopener noreferrer">$2</a>');
  s = s.replace(new RegExp("\$begin:math:display$img\\$end:math:display$(https?:\\/\\/[^\\]]+)\$begin:math:display$\\\\/img\\$end:math:display$", "gis"),
    '<img src="$1" alt="" style="max-width:100%;border-radius:8px"/>');
  s = s.replace(new RegExp("\$begin:math:display$quote\\$end:math:display$(.*?)\$begin:math:display$\\\\/quote\\$end:math:display$", "gis"),
    '<blockquote style="border-left:3px solid #ccc;padding-left:10px;margin:6px 0">$1</blockquote>');

  s = s.replace(new RegExp("\$begin:math:display$list\\$end:math:display$([\\s\\S]*?)\$begin:math:display$\\\\/list\\$end:math:display$", "gi"), (_, inner) => {
    const items = inner.split(/$begin:math:display$\\*$end:math:display$/).map(t => t.trim()).filter(Boolean);
    if (!items.length) return inner;
    return `<ul style="padding-left:20px;list-style:disc"><li>${items.join("</li><li>")}</li></ul>`;
  });

  s = s.replace(/\n/g, "<br/>");
  return s;
}

export default function Admin() {
  const router = useRouter();

  // Auth & data
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);

  // UI & states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("apps");
  const [errorMessage, setErrorMessage] = useState("");

  // App form
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [screenshotInput, setScreenshotInput] = useState("");
  const [search, setSearch] = useState("");

  // App Store autofill
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [loadingAppStoreInfo, setLoadingAppStoreInfo] = useState(false);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    fields: [],
    enable_appstore_fetch: false,
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newField, setNewField] = useState("");

  // Editor
  const [descMode, setDescMode] = useState("markdown"); // 'markdown' | 'bbcode'
  const descHtml = useMemo(() => {
    const content = form["description"] || form["mô tả"] || "";
    return descMode === "markdown" ? mdToHtml(content) : bbcodeToHtml(content);
  }, [form, descMode]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState([]);
  const allSelectedOnPage = (list) => list.length > 0 && list.every(a => selectedIds.includes(a.id));

  // Quick view
  const [quickState, setQuickState] = useState({ open: false, app: null });

  // helpers
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id && uuidRegex.test(id);
  };
  const createSlug = (name = "") =>
    name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
  const canFetchFromAppStore =
    categories.find((c) => c.id === selectedCategory)?.enable_appstore_fetch === true;

  // effects
  useEffect(() => { checkAdmin(); }, []);

  // hash/#tab và ?tab=
  useEffect(() => {
    const applyFromLocation = () => {
      const h = (typeof window !== "undefined" && window.location.hash) ? window.location.hash.replace("#", "") : "";
      const qtab = (router.query?.tab || "").toString();
      const tab = (h || qtab || "").toLowerCase();
      if (["apps", "categories", "certs"].includes(tab)) setActiveTab(tab);
    };
    applyFromLocation();
    const onHash = () => applyFromLocation();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.tab]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  // chống zoom iOS (fallback toàn cục)
  useEffect(() => {
    if (typeof document !== "undefined") {
      const style = document.createElement("style");
      style.innerHTML = `input, select, textarea { font-size:16px; }`;
      document.head.appendChild(style);
      return () => document.head.removeChild(style);
    }
  }, []);

  // tự tính size IPA
  useEffect(() => {
    async function fetchIpaSizeFromPlist() {
      const plistName = form["download_link"]?.trim();
      if (!plistName) return;

      try {
        const tokenRes = await fetch(`/api/generate-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ipa_name: plistName }),
        });
        if (!tokenRes.ok) throw new Error(`Lỗi lấy token: ${tokenRes.status}`);
        const { token } = await tokenRes.json();
        if (!token) throw new Error("Không nhận được token từ API");

        const plistUrl = `https://storeios.net/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${token}`;
        const plistResponse = await fetch(plistUrl);
        if (!plistResponse.ok) throw new Error(`Lỗi tải plist: ${plistResponse.status}`);

        const plistContent = await plistResponse.text();
        const ipaUrlMatch = plistContent.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
        if (!ipaUrlMatch || !ipaUrlMatch[1]) throw new Error("Không tìm thấy URL IPA trong plist");

        const ipaUrl = ipaUrlMatch[1];
        const sizeResponse = await fetch(`/api/admin/get-size-ipa?url=${encodeURIComponent(ipaUrl)}`);
        if (!sizeResponse.ok) throw new Error(`Lỗi lấy kích thước: ${sizeResponse.status}`);

        const { size, error: sizeError } = await sizeResponse.json();
        if (sizeError || !size) throw new Error(sizeError || "Không nhận được kích thước");

        setForm((prev) => ({ ...prev, size: `${(size / (1024 * 1024)).toFixed(2)} MB` }));
      } catch (error) {
        console.error("Tính size IPA lỗi:", { error: error.message });
        setForm((prev) => ({ ...prev, size: `Lỗi: ${error.message}` }));
      }
    }
    const timer = setTimeout(() => { if (form["download_link"]) fetchIpaSizeFromPlist(); }, 500);
    return () => clearTimeout(timer);
  }, [form["download_link"]]);

  useEffect(() => {
    if (form.screenshots) setScreenshotInput(form.screenshots.join("\n"));
  }, [form]);

  // data loaders
  async function checkAdmin() {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return router.push("/login");

      const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (!data || data?.role !== "admin") return router.push("/");

      setUser(user);
      await Promise.all([fetchCategories(), fetchApps()]);
    } catch (err) {
      console.error("Admin check error:", err);
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
    } catch (err) {
      console.error("Fetch categories error:", err);
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
    } catch (err) {
      console.error("Fetch apps error:", err);
      setErrorMessage("Lỗi tải danh sách ứng dụng");
    }
  }

  // actions apps
  function handleEdit(app) {
    if (!isValidUUID(app.category_id)) {
      setErrorMessage("ID chuyên mục không hợp lệ");
      return;
    }
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
    setForm(app);
    setScreenshotInput(Array.isArray(app.screenshots) ? app.screenshots.join("\n") : "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    try {
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
      await fetchApps();
    } catch (err) {
      console.error("Delete app error:", err);
      setErrorMessage("Lỗi khi xoá ứng dụng");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    if (!selectedCategory || !isValidUUID(selectedCategory)) {
      setErrorMessage("Vui lòng chọn chuyên mục hợp lệ");
      setSubmitting(false);
      return;
    }

    try {
      const screenshots = screenshotInput
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u && u.startsWith("http"));

      const normalizeToArray = (v) =>
        Array.isArray(v)
          ? v
          : (v || "")
              .toString()
              .split(/[,\n]+/)
              .map((s) => s.trim())
              .filter(Boolean);

      const payload = {
        ...form,
        category_id: selectedCategory,
        screenshots,
        languages: normalizeToArray(form.languages),
        supported_devices: normalizeToArray(form.supported_devices),
        updated_at: new Date().toISOString(),
        slug: form.name ? createSlug(form.name) : uuidv4(),
      };

      if (editingId) {
        const { error } = await supabase.from("apps").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("apps")
          .insert([{ ...payload, id: uuidv4(), created_at: new Date().toISOString() }]);
        if (error) throw error;
      }

      alert(editingId ? "Cập nhật thành công!" : "Thêm mới thành công!");
      resetForm(true);
      await fetchApps();
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMessage(err.message || "Lỗi khi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm(keepCategory = false) {
    setForm({});
    setEditingId(null);
    if (!keepCategory) setSelectedCategory("");
    setScreenshotInput("");
    setAppStoreUrl("");
  }

  // actions categories
  async function handleCategorySubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: createSlug(categoryForm.name),
        fields: categoryForm.fields,
        enable_appstore_fetch: !!categoryForm.enable_appstore_fetch,
      };

      if (editingCategoryId) {
        const { error } = await supabase.from("categories").update(payload).eq("id", editingCategoryId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert([{ ...payload, id: uuidv4() }]);
        if (error) throw error;
      }

      setCategoryForm({ name: "", fields: [], enable_appstore_fetch: false });
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (err) {
      console.error("Category submit error:", err);
      setErrorMessage(err.message || "Lỗi khi lưu chuyên mục");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      fields: Array.isArray(category.fields) ? [...category.fields] : [],
      enable_appstore_fetch: !!category.enable_appstore_fetch,
    });
    setActiveTab("categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCategory(id) {
    try {
      await supabase.from("apps").delete().eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
      await Promise.all([fetchCategories(), fetchApps()]);
    } catch (err) {
      console.error("Delete category error:", err);
      setErrorMessage("Lỗi khi xoá chuyên mục");
    }
  }

  function addField() {
    const f = newField.trim();
    if (!f) return;
    setCategoryForm((prev) => ({ ...prev, fields: [...prev.fields, f] }));
    setNewField("");
  }
  function removeField(index) {
    setCategoryForm((prev) => ({ ...prev, fields: prev.fields.filter((_, i) => i !== index) }));
  }

  // derived
  const filteredApps = useMemo(() => {
    const s = (search || "").toLowerCase().trim();
    if (!s) return apps;
    return apps.filter((a) => (a.name || "").toLowerCase().includes(s));
  }, [apps, search]);

  const totalApps = apps.length;
  const totalCategories = categories.length;

  // pagination slice
  const total = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageItems = filteredApps.slice(pageStart, pageEnd);

  // bulk select
  const allSelectedOnPage = (list) => list.length > 0 && list.every(a => selectedIds.includes(a.id));
  function toggleSelectAllOnPage() {
    const idsOnPage = pageItems.map(a => a.id);
    const isAll = allSelectedOnPage(pageItems);
    if (isAll) setSelectedIds(prev => prev.filter(id => !idsOnPage.includes(id)));
    else setSelectedIds(prev => Array.from(new Set([...prev, ...idsOnPage])));
  }
  function toggleSelectOne(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  // click outside drawer (mobile)
  const overlayRef = useRef(null);
  function onOverlayClick(e) {
    if (e.target === overlayRef.current) setSidebarOpen(false);
  }

  // render
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
        Đang tải dữ liệu quản trị...
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
      {/* Sidebar (ẩn mặc định, mở bằng icon 3 gạch) */}
      {sidebarOpen && (
        <div ref={overlayRef} onClick={onOverlayClick} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      )}

      <aside className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform md:relative md:translate-x-0 transition-transform`}>
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button onClick={() => { setActiveTab("apps"); setSidebarOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${activeTab === "apps" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
            <FontAwesomeIcon icon={faBoxOpen} /> Ứng dụng
          </button>
          <button onClick={() => { setActiveTab("categories"); setSidebarOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${activeTab === "categories" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
            <FontAwesomeIcon icon={faFolder} /> Chuyên mục
          </button>
          <button onClick={() => { setActiveTab("certs"); setSidebarOpen(false); }} className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${activeTab === "certs" ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200" : "hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
            <FontAwesomeIcon icon={faShieldAlt} /> Chứng chỉ
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <span className="ml-2 truncate">{user?.email}</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
            className="ml-auto text-red-500 hover:text-red-600"
            title="Đăng xuất"
          >
            <FontAwesomeIcon icon={faSignOutAlt} size="lg" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-6 overflow-auto pb-32">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Mở menu">
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h1 className="text-xl md:text-2xl font-bold">
              {activeTab === "apps"
                ? <>Quản lý Ứng dụng <span className="text-sm font-normal opacity-80">(Tổng: <b>{apps.length}</b>)</span></>
                : activeTab === "categories"
                ? <>Quản lý Chuyên mục <span className="text-sm font-normal opacity-80">(Tổng: <b>{categories.length}</b>)</span></>
                : "Quản lý Chứng chỉ"}
            </h1>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title={darkMode ? "Chế độ sáng" : "Chế độ tối"} aria-label="Đổi chế độ sáng/tối">
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>
        </header>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-r-md">
            <div className="flex justify-between items-center">
              <span><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />{errorMessage}</span>
              <button onClick={() => setErrorMessage("")} className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100" aria-label="Đóng cảnh báo">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        )}

        {/* ===== Apps tab ===== */}
        {activeTab === "apps" ? (
          <>
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
                {editingId ? "Sửa ứng dụng" : "Thêm ứng dụng mới"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* chọn chuyên mục */}
                <div>
                  <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSelectedCategory(newCat);
                      setForm((prev) => ({ ...prev, category_id: newCat }));
                      setErrorMessage("");
                    }}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">-- Chọn chuyên mục --</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* App Store autofill (giữ, chống zoom input) */}
                {selectedCategory && canFetchFromAppStore && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-md font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <FontAwesomeIcon icon={faApple} /> Lấy thông tin từ App Store
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        inputMode="url"
                        enterKeyHint="go"
                        value={appStoreUrl}
                        onChange={(e) => setAppStoreUrl(e.target.value)}
                        placeholder="Nhập URL App Store..."
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loadingAppStoreInfo}
                        style={{ fontSize: "16px" }} // chống zoom iOS chắc chắn
                      />
                      <button
                        type="button"
                        onClick={fetchAppStoreInfo}
                        disabled={loadingAppStoreInfo || !appStoreUrl.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2"
                      >
                        {loadingAppStoreInfo ? (<><FontAwesomeIcon icon={faSpinner} spin /> Đang lấy...</>) : (<><FontAwesomeIcon icon={faSync} /> Get Info</>)}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Tự động điền thông tin ứng dụng vào các trường bên dưới.</p>
                  </div>
                )}

                {/* dynamic fields */}
                {selectedCategory &&
                  (Array.isArray(categories.find(c => c.id === selectedCategory)?.fields) ? categories.find(c => c.id === selectedCategory)?.fields : []).map((field) => {
                    const lower = String(field).toLowerCase();
                    const isDesc = lower.includes("mô tả") || lower.includes("description");
                    const isScreens = lower.includes("screenshots");
                    const isDate = lower.includes("date");

                    if (isDesc) {
                      const descKey = field;
                      return (
                        <div key={field}>
                          <label className="block text-sm font-medium mb-2">{field}</label>
                          <div className="flex items-center gap-2 mb-2 text-xs">
                            <span>Chế độ:</span>
                            <button type="button" onClick={() => setDescMode("markdown")} className={`px-2 py-1 rounded border ${descMode === "markdown" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"}`}>
                              Markdown
                            </button>
                            <button type="button" onClick={() => setDescMode("bbcode")} className={`px-2 py-1 rounded border ${descMode === "bbcode" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600"}`}>
                              BBCode
                            </button>
                          </div>
                          <textarea
                            value={form[descKey] || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, [descKey]: e.target.value }))}
                            rows={6}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={descMode === "markdown" ? "Nhập mô tả bằng Markdown..." : "Nhập mô tả bằng BBCode..."}
                          />
                          {/* BỎ xem trước theo yêu cầu */}
                        </div>
                      );
                    }

                    return (
                      <div key={field}>
                        <label className="block text-sm font-medium mb-1">{field}</label>
                        {isScreens ? (
                          <textarea
                            value={screenshotInput}
                            onChange={(e) => setScreenshotInput(e.target.value)}
                            placeholder="Mỗi URL một dòng"
                            rows={4}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <input
                            type={isDate ? "date" : "text"}
                            value={form[field] || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={submitting || !selectedCategory} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                    {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin /> Đang lưu...</>) :
                      editingId ? (<><FontAwesomeIcon icon={faSave} /> Cập nhật</>) :
                      (<><FontAwesomeIcon icon={faPlus} /> Thêm mới</>)}
                  </button>

                  {editingId && (
                    <button type="button" onClick={() => resetForm(true)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium flex items-center gap-2">
                      <FontAwesomeIcon icon={faTimes} /> Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* Bulk + Search header */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <h2 className="text-lg md:text-xl font-semibold">
                  Danh sách ứng dụng <span className="text-sm font-normal opacity-80">(Đang lọc: <b>{total}</b> / Tổng: <b>{apps.length}</b>)</span>
                </h2>
                <div className="flex items-center gap-2">
                  <div className="relative w-56">
                    <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Tìm kiếm ứng dụng..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => { try { navigator.clipboard.writeText(window.location.href); } catch {} }}
                    className="hidden sm:flex px-3 py-2 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm items-center gap-2"
                    title="Sao chép URL trang hiện tại"
                  >
                    <FontAwesomeIcon icon={faCopy} /> Sao chép URL
                  </button>
                </div>
              </div>

              {/* ===== Mobile Cards (md:hidden) ===== */}
              <div className="md:hidden space-y-3">
                {/* chọn tất cả trang */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAllOnPage}
                    className="inline-flex items-center px-2 py-1 rounded bg-gray-100 dark:bg-gray-700"
                    title={allSelectedOnPage(pageItems) ? "Bỏ chọn trang này" : "Chọn tất cả trang này"}
                  >
                    <FontAwesomeIcon icon={allSelectedOnPage(pageItems) ? faCheckSquare : faSquare} />
                  </button>
                  <span className="text-sm opacity-80">Đã chọn: <b>{selectedIds.length}</b></span>
                </div>

                {pageItems.map((app) => (
                  <div
                    key={app.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900"
                  >
                    {/* Hàng đầu: checkbox + icon + tên/ngày */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(app.id)}
                        onChange={() => toggleSelectOne(app.id)}
                        className="w-4 h-4 mt-1"
                        aria-label="Chọn ứng dụng"
                      />
                      {app.icon_url ? (
                        <img src={app.icon_url} alt="" className="w-10 h-10 rounded mt-0.5" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium leading-5">{app.name || "Không có tên"}</div>
                        <div className="text-xs opacity-70 leading-5">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                        </div>
                      </div>
                    </div>

                    {/* Nút hành động */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setQuickState({ open: true, app })}
                        className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
                        title="Xem nhanh"
                      >
                        <FontAwesomeIcon icon={faEye} /> Xem
                      </button>
                      <button
                        onClick={() => handleEdit(app)}
                        className="px-3 py-2 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center justify-center gap-1"
                      >
                        <FontAwesomeIcon icon={faEdit} /> Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(app.id)}
                        className="px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center justify-center gap-1"
                      >
                        <FontAwesomeIcon icon={faTrash} /> Xoá
                      </button>
                    </div>
                  </div>
                ))}

                {pageItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {search ? "Không tìm thấy ứng dụng nào" : "Chưa có ứng dụng nào"}
                  </div>
                )}
              </div>

              {/* ===== Desktop Table (hidden trên mobile) ===== */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium w-10">
                        <button onClick={toggleSelectAllOnPage} className="inline-flex items-center" title={allSelectedOnPage(pageItems) ? "Bỏ chọn trang này" : "Chọn tất cả trang này"}>
                          <FontAwesomeIcon icon={allSelectedOnPage(pageItems) ? faCheckSquare : faSquare} />
                        </button>
                      </th>
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">Chuyên mục</th>
                      <th className="text-left p-3 font-medium">Ngày tạo</th>
                      <th className="text-left p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((app) => (
                      <tr
                        key={app.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                        onClick={(e) => {
                          const tag = (e.target.tagName || "").toLowerCase();
                          if (["button","svg","path","input","select"].includes(tag)) return;
                          setQuickState({ open: true, app });
                        }}
                      >
                        <td className="p-3 align-top">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(app.id)}
                            onChange={() => toggleSelectOne(app.id)}
                            className="w-4 h-4"
                            aria-label="Chọn ứng dụng"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            {app.icon_url ? <img src={app.icon_url} alt="" className="w-8 h-8 rounded" /> : null}
                            <span className="font-medium">{app.name || "Không có tên"}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span>
                              {categories.find((c) => c.id === app.category_id)?.name || "Không xác định"}
                            </span>
                            {/* Ẩn trên mobile, hiện trên desktop */}
                            <select
                              value={app.category_id || ""}
                              onChange={async (e) => {
                                const newCat = e.target.value;
                                try {
                                  if (!isValidUUID(newCat)) throw new Error("Chuyên mục không hợp lệ");
                                  const { error } = await supabase
                                    .from("apps")
                                    .update({ category_id: newCat, updated_at: new Date().toISOString() })
                                    .eq("id", app.id);
                                  if (error) throw error;
                                  setApps((prev) => prev.map((a) => (a.id === app.id ? { ...a, category_id: newCat } : a)));
                                } catch (err) {
                                  console.error("Move category error:", err);
                                  setErrorMessage(err.message || "Đổi chuyên mục thất bại");
                                }
                              }}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm hidden lg:inline-block"
                              aria-label="Đổi chuyên mục nhanh"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <option value="">-- Chọn --</option>
                              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                          </div>
                        </td>
                        <td className="p-3">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setQuickState({ open: true, app }); }}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 flex items-center gap-1"
                              title="Xem nhanh"
                            >
                              <FontAwesomeIcon icon={faEye} /> Xem
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(app); }}
                              className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEdit} /> Sửa
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(app.id); }}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faTrash} /> Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {pageItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {search ? "Không tìm thấy ứng dụng nào" : "Chưa có ứng dụng nào"}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm opacity-80">
                  Đang hiển thị <b>{pageItems.length}</b> / <b>{total}</b> kết quả • Trang <b>{currentPage}</b> / {totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Hiển thị:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      disabled={currentPage <= 1}
                      title="Trang trước"
                    >
                      <FontAwesomeIcon icon={faChevronLeft} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                      disabled={currentPage >= totalPages}
                      title="Trang sau"
                    >
                      <FontAwesomeIcon icon={faChevronRight} />
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        ) : null}

        {/* ===== Categories tab ===== */}
        {activeTab === "categories" ? (
          <>
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={editingCategoryId ? faEdit : faPlus} />
                {editingCategoryId ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}
              </h2>

              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Tên chuyên mục:</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs mt-1 text-gray-500">Slug sẽ được tạo tự động từ tên.</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="enable_appstore_fetch"
                    type="checkbox"
                    checked={!!categoryForm.enable_appstore_fetch}
                    onChange={(e) => setCategoryForm((prev) => ({ ...prev, enable_appstore_fetch: e.target.checked }))}
                    className="h-4 w-4"
                  />
                  <label htmlFor="enable_appstore_fetch" className="text-sm">Bật tự động lấy thông tin từ App Store cho chuyên mục này</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Trường dữ liệu:</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      placeholder="Ví dụ: name, author, icon_url, description, screenshots, version..."
                      className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button type="button" onClick={addField} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2">
                      <FontAwesomeIcon icon={faPlus} /> Thêm
                    </button>
                  </div>

                  <div className="space-y-2">
                    {categoryForm.fields.map((field, index) => (
                      <div key={`${field}-${index}`} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="flex-1">{field}</span>
                        <button type="button" onClick={() => removeField(index)} className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600" title="Xoá trường">
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="submit" disabled={submitting || !categoryForm.name.trim()} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                    {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin /> Đang lưu...</>) :
                      editingCategoryId ? (<><FontAwesomeIcon icon={faSave} /> Cập nhật</>) :
                      (<><FontAwesomeIcon icon={faPlus} /> Thêm mới</>)}
                  </button>

                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => { setEditingCategoryId(null); setCategoryForm({ name: "", fields: [], enable_appstore_fetch: false }); }}
                      className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 font-medium flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} /> Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <h2 className="text-lg md:text-xl font-semibold mb-4">
                Danh sách chuyên mục <span className="text-sm font-normal opacity-80">(Tổng: <b>{categories.length}</b>)</span>
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">Slug</th>
                      <th className="text-left p-3 font-medium">AppStore Fetch</th>
                      <th className="text-left p-3 font-medium">Số trường</th>
                      <th className="text-left p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => (
                      <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3">{category.slug || "-"}</td>
                        <td className="p-3">{category.enable_appstore_fetch ? "Bật" : "Tắt"}</td>
                        <td className="p-3">{category.fields?.length || 0} trường</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button onClick={() => handleEditCategory(category)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center gap-1">
                              <FontAwesomeIcon icon={faEdit} /> Sửa
                            </button>
                            <button onClick={() => handleDeleteCategory(category.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1">
                              <FontAwesomeIcon icon={faTrash} /> Xoá
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Chưa có chuyên mục nào</div>
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* ===== Certs tab ===== */}
        {activeTab === "certs" ? (
          <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
            <h2 className="text-lg md:text-xl font-semibold mb-4">
              <FontAwesomeIcon icon={faShieldAlt} className="mr-2" />
              Quản lý và ký chứng chỉ
            </h2>
            <CertManagerAndSigner />
          </section>
        ) : null}
      </main>

      {/* Quick View */}
      <QuickViewModal
        open={quickState.open}
        onClose={() => setQuickState({ open: false, app: null })}
        app={quickState.app}
        categories={categories}
        htmlDesc={(() => {
          const raw = quickState.app ? (quickState.app.description || quickState.app["mô tả"] || "") : "";
          return descMode === "markdown" ? mdToHtml(raw) : bbcodeToHtml(raw);
        })()}
      />
    </div>
  );
}