// pages/admin/index.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import CertManagerAndSigner from "../../components/admin/CertManagerAndSigner";

import { toast } from "react-toastify";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faEdit, faTrash, faSave, faTimes, faSync, faSpinner,
  faBoxOpen, faFolder, faShieldAlt, faSun, faMoon, faBars,
  faSignOutAlt, faSearch, faExclamationTriangle, faEye, faCheckSquare, faSquare,
  faChevronDown, faChevronUp, faLayerGroup, faExchangeAlt,
  faNewspaper,            // 👈 THÊM ICON BLOG
} from "@fortawesome/free-solid-svg-icons";
import { faApple } from "@fortawesome/free-brands-svg-icons";

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

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMenuOpen, setBulkMenuOpen] = useState(false);

  // Modals
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // xoá 1 app
  const [confirmBulkDeleteOpen, setConfirmBulkDeleteOpen] = useState(false); // xoá nhiều
  const [moveModalOpen, setMoveModalOpen] = useState(false); // chuyển chuyên mục nhiều
  const [moveTargetCategory, setMoveTargetCategory] = useState("");
  const [busyAction, setBusyAction] = useState(""); // "deleting" | "bulk-deleting" | "moving" | "saving"

  // --- helpers ---
  const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return id && uuidRegex.test(id);
  };

  const createSlug = (name = "") =>
    name
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();

  const canFetchFromAppStore =
    categories.find((c) => c.id === selectedCategory)?.enable_appstore_fetch === true;

  // --- effects ---
  useEffect(() => { checkAdmin(); }, []);

  // hash/#tab và ?tab=
  useEffect(() => {
    const applyFromLocation = () => {
      const h = (typeof window !== "undefined" && window.location.hash)
        ? window.location.hash.replace("#", "")
        : "";
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

  // Tự tính SIZE từ plist khi nhập tên IPA (download_link = tên plist/ipa name)
  // Tự tính SIZE từ plist khi nhập tên IPA (hỗ trợ nhiều tên trường & 2 cấu trúc plist)
  useEffect(() => {
    const getPlistName = () =>
      (form?.download_link || form?.plist || form?.plist_name || form?.manifest || "")
        .toString()
        .trim();

    async function fetchIpaSizeFromPlist() {
      const plistName = getPlistName();
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

        // Pattern 1: <key>url</key><string>...ipa</string>
        let match = plistContent.match(/<key>\s*url\s*<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);

        // Pattern 2: assets -> software-package -> <string>https://...ipa</string>
        if (!match) {
          match = plistContent.match(
            /<string>\s*software-package\s*<\/string>[\s\S]*?<string>(https?:[^<]+\.ipa)<\/string>/i
          );
        }
        if (!match || !match[1]) throw new Error("Không tìm thấy URL IPA trong plist");

        const ipaUrl = match[1].trim();
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

    const timer = setTimeout(() => {
      if (getPlistName()) fetchIpaSizeFromPlist();
    }, 600);

    return () => clearTimeout(timer);
    // Theo dõi nhiều khả năng tên trường
  }, [form?.download_link, form?.plist, form?.plist_name, form?.manifest]);

  useEffect(() => {
    if (form.screenshots) setScreenshotInput(form.screenshots.join("\n"));
  }, [form]);

  // --- data loaders ---
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

  // --- actions (apps) ---
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

  function askDelete(id) {
    setConfirmDeleteId(id);
  }

  async function doDelete(id) {
    try {
      setBusyAction("deleting");
      const { error } = await supabase.from("apps").delete().eq("id", id);
      if (error) throw error;
      await fetchApps();
      toast.success("Đã xoá ứng dụng!");
    } catch (err) {
      console.error("Delete app error:", err);
      toast.error("Xoá ứng dụng thất bại!");
    } finally {
      setBusyAction("");
      setConfirmDeleteId(null);
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
      // Chuẩn hoá screenshots
      const screenshots = screenshotInput
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u && u.startsWith("http"));

      // Chuẩn hoá languages & supported_devices về mảng
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
        toast.success("Cập nhật ứng dụng thành công!");
      } else {
        const { error } = await supabase
          .from("apps")
          .insert([{ ...payload, id: uuidv4(), created_at: new Date().toISOString() }]);
        if (error) throw error;
        toast.success("Thêm ứng dụng mới thành công!");
      }

      resetForm(true); // giữ lại selectedCategory
      await fetchApps();
    } catch (err) {
      console.error("Submit error:", err);
      setErrorMessage(err.message || "Lỗi khi lưu dữ liệu");
      toast.error("Lưu dữ liệu thất bại!");
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

  // --- actions (App Store autofill) ---
  const fetchAppStoreInfo = async () => {
    if (!appStoreUrl.trim()) {
      setErrorMessage("Vui lòng nhập URL AppStore");
      return;
    }
    if (!appStoreUrl.includes("apps.apple.com")) {
      setErrorMessage("URL phải là từ App Store (apps.apple.com)");
      return;
    }

    setLoadingAppStoreInfo(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/appstore-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appStoreUrl.trim() }),
      });

      const text = await res.text();
      if (!text.trim()) throw new Error("Server trả về phản hồi rỗng");

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error(`Phản hồi từ server không phải JSON hợp lệ: ${text.slice(0, 100)}...`);
      }

      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}: ${res.statusText}`);
      }
      if (!data?.name) throw new Error("Dữ liệu ứng dụng không đầy đủ (thiếu tên)");

      const mapped = {
        name: data.name || "",
        author: data.author || "",
        size: data.size || "",
        description: data.description || "",
        version: data.version || "",
        icon_url: data.icon || "",
        minimum_os_version: data.minimumOsVersion || "",
        age_rating: data.ageRating || "",
        release_date: data.releaseDate
          ? new Date(data.releaseDate).toISOString().split("T")[0]
          : "",
        supported_devices: Array.isArray(data.supportedDevices)
          ? data.supportedDevices.join(", ")
          : "",
        languages: Array.isArray(data.languages) ? data.languages.join(", ") : "",
        screenshots: Array.isArray(data.screenshots) ? data.screenshots : [],
      };

      setForm((prev) => ({ ...prev, ...mapped }));
      if (Array.isArray(mapped.screenshots) && mapped.screenshots.length) {
        setScreenshotInput(mapped.screenshots.join("\n"));
      }

      setAppStoreUrl("");
      toast.success("Đã lấy thông tin từ App Store!");
    } catch (err) {
      let msg = "Lỗi khi lấy thông tin từ AppStore";
      if (err.name === "TypeError" && String(err.message).includes("fetch"))
        msg = "Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet.";
      else if (String(err.message).includes("JSON"))
        msg = "Lỗi xử lý dữ liệu từ server.";
      else if (err.message) msg = err.message;

      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setLoadingAppStoreInfo(false);
    }
  };

  // --- actions (categories) ---
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
        const { error } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategoryId);
        if (error) throw error;
        toast.success("Cập nhật chuyên mục thành công!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ ...payload, id: uuidv4() }]);
        if (error) throw error;
        toast.success("Thêm chuyên mục mới thành công!");
      }

      setCategoryForm({ name: "", fields: [], enable_appstore_fetch: false });
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (err) {
      console.error("Category submit error:", err);
      setErrorMessage(err.message || "Lỗi khi lưu chuyên mục");
      toast.error("Lưu chuyên mục thất bại!");
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
    if (typeof window !== "undefined") window.location.hash = "categories";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDeleteCategory(id) {
    if (!confirm("Xoá chuyên mục sẽ xoá tất cả ứng dụng thuộc chuyên mục này. Xác nhận xoá?"))
      return;
    try {
      await supabase.from("apps").delete().eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id);
      await Promise.all([fetchCategories(), fetchApps()]);
      toast.success("Đã xoá chuyên mục!");
    } catch (err) {
      console.error("Delete category error:", err);
      setErrorMessage("Lỗi khi xoá chuyên mục");
      toast.error("Xoá chuyên mục thất bại!");
    }
  }

  function addField() {
    const f = newField.trim();
    if (!f) return;
    setCategoryForm((prev) => ({ ...prev, fields: [...prev.fields, f] }));
    setNewField("");
  }
  function removeField(index) {
    setCategoryForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }

  // --- derived ---
  const filteredApps = useMemo(() => {
    const s = (search || "").toLowerCase().trim();
    if (!s) return apps;
    return apps.filter((a) => (a.name || "").toLowerCase().includes(s));
  }, [apps, search]);

  const totalApps = apps.length;
  const totalCategories = categories.length;

  // --- pagination slice ---
  const total = filteredApps.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageItems = filteredApps.slice(pageStart, pageEnd);

  // --- bulk select ---
  const allSelectedOnPage = (list) =>
    list.length > 0 && list.every((a) => selectedIds.includes(a.id));
  function toggleSelectAllOnPage() {
    const idsOnPage = pageItems.map((a) => a.id);
    const isAll = allSelectedOnPage(pageItems);
    setSelectedIds((prev) =>
      isAll ? prev.filter((id) => !idsOnPage.includes(id)) : Array.from(new Set([...prev, ...idsOnPage]))
    );
  }
  function toggleOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function clearSelected() {
    setSelectedIds([]);
  }

  // --- bulk actions ---
  function openBulkDelete() {
    if (selectedIds.length === 0) return;
    setConfirmBulkDeleteOpen(true);
    setBulkMenuOpen(false);
  }
  function openMoveModal() {
    if (selectedIds.length === 0) return;
    setMoveTargetCategory("");
    setMoveModalOpen(true);
    setBulkMenuOpen(false);
  }

  async function doBulkDelete() {
    try {
      setBusyAction("bulk-deleting");
      const { error } = await supabase.from("apps").delete().in("id", selectedIds);
      if (error) throw error;
      await fetchApps();
      toast.success(`Đã xoá ${selectedIds.length} ứng dụng!`);
      clearSelected();
      setConfirmBulkDeleteOpen(false);
    } catch (err) {
      console.error("Bulk delete error:", err);
      toast.error("Xoá hàng loạt thất bại!");
    } finally {
      setBusyAction("");
    }
  }

  async function doMoveCategory() {
    if (!moveTargetCategory || !isValidUUID(moveTargetCategory)) {
      toast.error("Vui lòng chọn chuyên mục hợp lệ!");
      return;
    }
    try {
      setBusyAction("moving");
      const { error } = await supabase
        .from("apps")
        .update({ category_id: moveTargetCategory, updated_at: new Date().toISOString() })
        .in("id", selectedIds);
      if (error) throw error;
      await fetchApps();
      toast.success(`Đã chuyển ${selectedIds.length} ứng dụng!`);
      clearSelected();
      setMoveModalOpen(false);
    } catch (err) {
      console.error("Move error:", err);
      toast.error("Chuyển chuyên mục thất bại!");
    } finally {
      setBusyAction("");
    }
  }

  // --- render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
        Đang tải dữ liệu quản trị...
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex transition-colors duration-300 ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"
      }`}
    >
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform md:relative md:translate-x-0 transition-transform`}
      >
        <div className="p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Admin Panel</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-gray-500 hover:text-gray-700"
            aria-label="Đóng menu"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => {
              setActiveTab("apps");
              setSidebarOpen(false);
              if (typeof window !== "undefined") window.location.hash = "apps";
            }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${
              activeTab === "apps"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <FontAwesomeIcon icon={faBoxOpen} /> Ứng dụng
          </button>
          <button
            onClick={() => {
              setActiveTab("categories");
              setSidebarOpen(false);
              if (typeof window !== "undefined") window.location.hash = "categories";
            }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${
              activeTab === "categories"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <FontAwesomeIcon icon={faFolder} /> Chuyên mục
          </button>
          <button
            onClick={() => {
              setActiveTab("certs");
              setSidebarOpen(false);
              if (typeof window !== "undefined") window.location.hash = "certs";
            }}
            className={`w-full text-left flex items-center gap-3 px-4 py-2 rounded ${
              activeTab === "certs"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <FontAwesomeIcon icon={faShieldAlt} /> Chứng chỉ
          </button>

          {/* 👇 TAB BLOG – chuyển sang /admin/blog */}
          <button
            onClick={() => {
              setSidebarOpen(false);
              router.push("/admin/blog");
            }}
            className="w-full text-left flex items-center gap-3 px-4 py-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <FontAwesomeIcon icon={faNewspaper} /> Blog
          </button>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <span className="ml-2 truncate">{user?.email}</span>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.push("/login");
            }}
            className="ml-auto text-red-500 hover:text-red-600"
            title="Đăng xuất"
            aria-label="Đăng xuất"
          >
            <FontAwesomeIcon icon={faSignOutAlt} size="lg" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-4 md:p-6 overflow-auto pb-32">
        <header className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              aria-label="Mở menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <h1 className="text-xl md:text-2xl font-bold">
              {activeTab === "apps"
                ? <>Quản lý Ứng dụng <span className="text-sm font-normal opacity-70">({totalApps})</span></>
                : activeTab === "categories"
                ? <>Quản lý Chuyên mục <span className="text-sm font-normal opacity-70">({totalCategories})</span></>
                : "Quản lý Chứng chỉ"}
            </h1>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title={darkMode ? "Chế độ sáng" : "Chế độ tối"}
            aria-label="Chuyển chế độ sáng/tối"
          >
            <FontAwesomeIcon icon={darkMode ? faSun : faMoon} />
          </button>
        </header>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-r-md">
            <div className="flex justify-between items-center">
              <span>
                <FontAwesomeIcon icon={faExclamationTriangle} className="mr-2" />
                {errorMessage}
              </span>
              <button
                onClick={() => setErrorMessage("")}
                className="text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100"
                aria-label="Đóng cảnh báo"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
          </div>
        )}

        {/* ====== Apps tab ====== */}
        {activeTab === "apps" ? (
          <>
            {/* Form App */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
                {editingId ? "Sửa ứng dụng" : "Thêm ứng dụng mới"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* category selector */}
                <div>
                  <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setSelectedCategory(newCat);
                      setEditingId(null);
                      setForm({ category_id: newCat });
                      setScreenshotInput("");
                      setAppStoreUrl("");
                      setErrorMessage("");
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

                {/* App Store autofill (bật qua flag enable_appstore_fetch) */}
                {selectedCategory && canFetchFromAppStore && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h3 className="text-md font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                      <FontAwesomeIcon icon={faApple} /> Lấy thông tin từ App Store
                    </h3>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        inputMode="url"
                        pattern="https?://.*"
                        value={appStoreUrl}
                        onChange={(e) => setAppStoreUrl(e.target.value)}
                        placeholder="Nhập URL App Store..."
                        className="flex-1 px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        disabled={loadingAppStoreInfo}
                      />
                      <button
                        type="button"
                        onClick={fetchAppStoreInfo}
                        disabled={loadingAppStoreInfo || !appStoreUrl.trim()}
                        className="px-3 py-2 text-sm font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {loadingAppStoreInfo ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin /> Đang lấy...
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faSync} /> Get Info
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                      Tự động điền thông tin ứng dụng vào các trường bên dưới.
                    </p>
                  </div>
                )}

                {/* dynamic fields */}
                {selectedCategory &&
                  (categories.find((c) => c.id === selectedCategory)?.fields || []).map((field) => {
                    const lower = field.toLowerCase();
                    const isDesc = lower.includes("mô tả") || lower.includes("description");
                    const isScreens = lower.includes("screenshots");
                    const isDate = lower.includes("date");
                    return (
                      <div key={field}>
                        <label className="block text-sm font-medium mb-1">{field}</label>
                        {isDesc ? (
                          <textarea
                            value={form[field] || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                            rows={4}
                            className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : isScreens ? (
                          <textarea
                            value={screenshotInput}
                            onChange={(e) => setScreenshotInput(e.target.value)}
                            placeholder="Mỗi URL một dòng"
                            rows={4}
                            className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <input
                            type={isDate ? "date" : "text"}
                            value={form[field] || ""}
                            onChange={(e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))}
                            className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        )}
                      </div>
                    );
                  })}

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !selectedCategory}
                    className={`px-4 py-2 text-sm font-semibold rounded text-white flex items-center gap-2 ${
                      editingId
                        ? "bg-green-600 hover:bg-green-700"
                        : "bg-blue-600 hover:bg-blue-700"
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {submitting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> Đang lưu...
                      </>
                    ) : editingId ? (
                      <>
                        <FontAwesomeIcon icon={faSave} /> Cập nhật
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} /> Thêm mới
                      </>
                    )}
                  </button>

                  {editingId && (
                    <button
                      type="button"
                      onClick={() => resetForm(true)}
                      className="px-4 py-2 text-sm font-semibold rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} /> Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* List Apps */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <h2 className="text-lg md:text-xl font-semibold">
                  Danh sách ứng dụng <span className="text-sm font-normal opacity-70">({total})</span>
                </h2>
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:flex-initial md:w-64">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                    <input
                      type="text"
                      placeholder="Tìm kiếm ứng dụng..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                      className="w-full pl-10 pr-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(1); }}
                    className="px-3 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    aria-label="Số dòng mỗi trang"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Bulk toolbar */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleSelectAllOnPage}
                    className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
                  >
                    <FontAwesomeIcon icon={allSelectedOnPage(pageItems) ? faCheckSquare : faSquare} />
                    Chọn trang này
                  </button>

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBulkMenuOpen((v) => !v)}
                      disabled={selectedIds.length === 0}
                      className="flex items-center gap-2 px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-semibold"
                    >
                      <FontAwesomeIcon icon={faLayerGroup} />
                      Tác vụ ({selectedIds.length})
                      <FontAwesomeIcon icon={bulkMenuOpen ? faChevronUp : faChevronDown} />
                    </button>

                    {bulkMenuOpen && (
                      <div className="absolute z-10 mt-2 w-56 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
                        <button
                          onClick={openBulkDelete}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faTrash} className="text-red-500" />
                          Xoá đã chọn
                        </button>
                        <button
                          onClick={openMoveModal}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <FontAwesomeIcon icon={faExchangeAlt} className="text-blue-500" />
                          Chuyển chuyên mục
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {selectedIds.length > 0 && (
                  <div className="text-sm opacity-80">
                    Đã chọn <b>{selectedIds.length}</b> mục
                    <button
                      onClick={clearSelected}
                      className="ml-3 px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}
              </div>

              {/* Desktop table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse hidden md:table">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left p-3 font-medium w-10"></th>
                      <th className="text-left p-3 font-medium">Tên</th>
                      <th className="text-left p-3 font-medium">Chuyên mục</th>
                      <th className="text-left p-3 font-medium">Ngày tạo</th>
                      <th className="text-left p-3 font-medium">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems.map((app) => {
                      const catName = categories.find((c) => c.id === app.category_id)?.name || "Không xác định";
                      const slug = app.slug || app.id;
                      const isChecked = selectedIds.includes(app.id);
                      return (
                        <tr
                          key={app.id}
                          className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleOne(app.id)}
                              className="w-4 h-4"
                            />
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {app.icon_url && <img src={app.icon_url} alt="" className="w-8 h-8 rounded" />}
                              <Link href={`/${slug}`} target="_blank" className="font-medium text-blue-600 hover:underline">
                                {app.name || "Không có tên"}
                              </Link>
                            </div>
                          </td>
                          <td className="p-3">{catName}</td>
                          <td className="p-3">
                            {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <Link
                                href={`/${slug}`}
                                target="_blank"
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                              >
                                <FontAwesomeIcon icon={faEye} /> Xem
                              </Link>
                              <button
                                onClick={() => handleEdit(app)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1"
                              >
                                <FontAwesomeIcon icon={faEdit} /> Sửa
                              </button>
                              <button
                                onClick={() => askDelete(app.id)}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
                              >
                                <FontAwesomeIcon icon={faTrash} /> Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile cards */}
                <ul className="md:hidden space-y-3">
                  {pageItems.map((app) => {
                    const catName = categories.find((c) => c.id === app.category_id)?.name || "Không xác định";
                    const slug = app.slug || app.id;
                    const isChecked = selectedIds.includes(app.id);
                    return (
                      <li key={app.id} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleOne(app.id)}
                            className="w-5 h-5"
                          />
                          {app.icon_url && <img src={app.icon_url} alt="" className="w-8 h-8 rounded" />}
                          <div className="flex-1">
                            <Link href={`/${slug}`} target="_blank" className="font-semibold text-blue-600 hover:underline block">
                              {app.name || "Không có tên"}
                            </Link>
                            <div className="text-xs opacity-70 mt-0.5">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 text-sm opacity-80">
                          Chuyên mục: <span className="font-medium">{catName}</span>
                        </div>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Link
                            href={`/${slug}`}
                            target="_blank"
                            className="hidden md:flex text-center px-2.5 py-1 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faEye} /> <span>Xem</span>
                          </Link>
                          <button
                            onClick={() => handleEdit(app)}
                            className="hidden md:flex text-center px-2.5 py-1 text-xs font-semibold rounded bg-yellow-500 text-white hover:bg-yellow-600 items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faEdit} /> <span>Sửa</span>
                          </button>
                          <button
                            onClick={() => askDelete(app.id)}
                            className="hidden md:flex text-center px-2.5 py-1 text-xs font-semibold rounded bg-red-500 text-white hover:bg-red-600 items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTrash} /> <span>Xoá</span>
                          </button>

                          {/* Mobile -- chỉ icon */}
                          <Link
                            href={`/${slug}`}
                            target="_blank"
                            className="md:hidden text-green-500 hover:text-green-600 text-base p-2 flex items-center justify-center"
                            aria-label="Xem"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </Link>

                          <button
                            onClick={() => handleEdit(app)}
                            className="md:hidden text-yellow-500 hover:text-yellow-600 text-base p-2 flex items-center justify-center"
                            aria-label="Sửa"
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>

                          <button
                            onClick={() => askDelete(app.id)}
                            className="md:hidden text-red-500 hover:text-red-600 text-base p-2 flex items-center justify-center"
                            aria-label="Xoá"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {pageItems.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    {search ? "Không tìm thấy ứng dụng nào" : "Chưa có ứng dụng nào"}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                  >
                    « Trước
                  </button>
                  <span className="text-sm">
                    Trang <b>{currentPage}</b>/<b>{totalPages}</b>
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
            </section>
          </>
        ) : null}

        {/* ====== Categories tab ====== */}
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
                    onChange={(e) =>
                      setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    className="w-full px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs mt-1 text-gray-500">
                    Slug sẽ được tạo tự động từ tên.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    id="enable_appstore_fetch"
                    type="checkbox"
                    checked={!!categoryForm.enable_appstore_fetch}
                    onChange={(e) =>
                      setCategoryForm((prev) => ({
                        ...prev,
                        enable_appstore_fetch: e.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <label htmlFor="enable_appstore_fetch" className="text-sm">
                    Bật tự động lấy thông tin từ App Store cho chuyên mục này
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Trường dữ liệu:</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newField}
                      onChange={(e) => setNewField(e.target.value)}
                      placeholder="Nhập tên trường mới (ví dụ: name, author, icon_url, ...)"
                      className="flex-1 px-4 py-2 text-base border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={addField}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold text-sm"
                    >
                      <FontAwesomeIcon icon={faPlus} /> Thêm
                    </button>
                  </div>

                  <div className="space-y-2">
                    {categoryForm.fields.map((field, index) => (
                      <div
                        key={`${field}-${index}`}
                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded"
                      >
                        <span className="flex-1">{field}</span>
                        <button
                          type="button"
                          onClick={() => removeField(index)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 font-semibold"
                          title="Xoá trường"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={submitting || !categoryForm.name.trim()}
                    className={`px-4 py-2 text-sm font-semibold text-white rounded flex items-center gap-2 ${
                      editingCategoryId ? "bg-green-600 hover:bg-green-700" : "bg-blue-600 hover:bg-blue-700"
                    } disabled:bg-gray-400 disabled:cursor-not-allowed`}
                  >
                    {submitting ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin /> Đang lưu...
                      </>
                    ) : editingCategoryId ? (
                      <>
                        <FontAwesomeIcon icon={faSave} /> Cập nhật
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faPlus} /> Thêm mới
                      </>
                    )}
                  </button>

                  {editingCategoryId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategoryId(null);
                        setCategoryForm({ name: "", fields: [], enable_appstore_fetch: false });
                      }}
                      className="px-4 py-2 text-sm font-semibold rounded bg-red-500 text-white hover:bg-red-600 flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} /> Hủy
                    </button>
                  )}
                </div>
              </form>
            </section>

            {/* categories list */}
            <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg md:text-xl font-semibold">
                  Danh sách chuyên mục <span className="text-sm font-normal opacity-70">({totalCategories})</span>
                </h2>
              </div>
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
                      <tr
                        key={category.id}
                        className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <td className="p-3 font-medium">{category.name}</td>
                        <td className="p-3">{category.slug || "-"}</td>
                        <td className="p-3">
                          {category.enable_appstore_fetch ? "Bật" : "Tắt"}
                        </td>
                        <td className="p-3">{category.fields?.length || 0} trường</td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="px-2.5 py-1 text-xs font-semibold rounded bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-1"
                            >
                              <FontAwesomeIcon icon={faEdit} /> Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
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

                {categories.length === 0 && (
                  <div className="text-center py-8 text-gray-500">Chưa có chuyên mục nào</div>
                )}
              </div>
            </section>
          </>
        ) : null}

        {/* ====== Certs tab ====== */}
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

      {/* ---------- MODALS ---------- */}

      {/* Confirm delete single */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative z-10 w-11/12 max-w-sm rounded-lg bg-white dark:bg-gray-800 p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Xác nhận xoá</h3>
            <p className="text-sm opacity-80 mb-4">Bạn có chắc muốn xoá ứng dụng này?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Huỷ
              </button>
              <button
                onClick={() => doDelete(confirmDeleteId)}
                disabled={busyAction === "deleting"}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              >
                {busyAction === "deleting" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk delete */}
      {confirmBulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmBulkDeleteOpen(false)} />
          <div className="relative z-10 w-11/12 max-w-sm rounded-lg bg-white dark:bg-gray-800 p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Xác nhận xoá hàng loạt</h3>
            <p className="text-sm opacity-80 mb-4">
              Bạn sắp xoá <b>{selectedIds.length}</b> ứng dụng. Thao tác này không thể hoàn tác.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmBulkDeleteOpen(false)}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Huỷ
              </button>
              <button
                onClick={doBulkDelete}
                disabled={busyAction === "bulk-deleting"}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-red-500 text-white hover:bg-red-600 disabled:opacity-60"
              >
                {busyAction === "bulk-deleting" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Xoá"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move category modal */}
      {moveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMoveModalOpen(false)} />
          <div className="relative z-10 w-11/12 max-w-sm rounded-lg bg-white dark:bg-gray-800 p-5 shadow-lg">
            <h3 className="text-lg font-semibold mb-3">Chuyển chuyên mục</h3>
            <label className="block text-sm font-medium mb-1">Chọn chuyên mục đích:</label>
            <select
              value={moveTargetCategory}
              onChange={(e) => setMoveTargetCategory(e.target.value)}
              className="w-full mb-4 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
            >
              <option value="">-- Chọn chuyên mục --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setMoveModalOpen(false)}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Huỷ
              </button>
              <button
                onClick={doMoveCategory}
                disabled={busyAction === "moving" || !moveTargetCategory}
                className="px-3 py-1.5 text-sm font-semibold rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-60"
              >
                {busyAction === "moving" ? <FontAwesomeIcon icon={faSpinner} spin /> : "Chuyển"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}