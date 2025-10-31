// pages/admin/index.js
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { auth, db } from "../../lib/firebase-client";
import {
  collection, doc, query, where, orderBy, limit, onSnapshot, updateDoc, deleteDoc,
} from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faEdit, faTrash, faSave, faTimes, faSync, faSpinner,
  faBoxOpen, faFolder, faShieldAlt, faSun, faMoon, faBars,
  faSignOutAlt, faSearch, faExclamationTriangle, faCheck, faCopy,
  faCloudDownloadAlt, faCloudUploadAlt, faTriangleExclamation, faXmark,
  faEye, faEyeSlash, faListCheck, faArrowRotateRight, faGauge
} from "@fortawesome/free-solid-svg-icons";

// --- UI helpers (inline components) ---
function Toast({ item }) {
  if (!item) return null;
  return (
    <div className="fixed top-[18%] left-1/2 -translate-x-1/2 z-[100]">
      <div className={`px-4 py-3 rounded-lg shadow-lg text-white text-sm
        ${item.type==='error' ? 'bg-red-600' :
           item.type==='warn'  ? 'bg-amber-600' : 'bg-green-600'}`}>
        {item.message}
      </div>
    </div>
  );
}
function useToast() {
  const [toast, setToast] = useState(null);
  const show = (message, type="success", ms=2200) => {
    setToast({ message, type });
    setTimeout(()=>setToast(null), ms);
  };
  return { toast, show };
}
function ConfirmModal({ open, title, note, onOk, onCancel, okText="Xác nhận", danger=false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 w-[95%] max-w-md rounded-lg p-5 shadow-xl">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        {note && <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{note}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={onCancel}
            className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">
            Hủy
          </button>
          <button onClick={onOk}
            className={`px-4 py-2 rounded text-white ${danger?'bg-red-600 hover:bg-red-700':'bg-blue-600 hover:bg-blue-700'}`}>
            {okText}
          </button>
        </div>
      </div>
    </div>
  );
}
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-3"><div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded" /></td>
    <td className="p-3"><div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded" /></td>
    <td className="p-3"><div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded" /></td>
    <td className="p-3"><div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded" /></td>
  </tr>
);

// --- Utilities ---
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id) => id && uuidRegex.test(id);
const createSlug = (name = "") =>
  name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
const uniqueArray = (arr) => Array.from(new Set(arr));

const inputBaseClass = "w-full px-4 py-3 text-[16px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

// Debounce hook
function useDebounce(value, ms=400) {
  const [v,setV]=useState(value);
  useEffect(()=>{
    const t=setTimeout(()=>setV(value), ms);
    return ()=>clearTimeout(t);
  },[value,ms]);
  return v;
}

// In-memory caches
const appStoreCache = new Map(); // key = url, val = response
const appListCache  = new Map(); // key = JSON(params), val = data

export default function Admin() {
  const router = useRouter();
  const { toast, show } = useToast();

  // Auth & data
  const [user, setUser] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard | apps | categories | community
  useEffect(()=>{
    const t = (router.query.tab || 'dashboard').toString();
    setActiveTab(t);
  },[router.query.tab]);
  const goTab = (t) => {
    setActiveTab(t);
    router.replace({ pathname: '/admin', query: { tab: t } }, undefined, { shallow: true });
  };

  // UI & states
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Apps data
  const [apps, setApps] = useState([]);
  const [totalApps, setTotalApps] = useState(0);
  const [categories, setCategories] = useState([]);

  // Pagination / search / sort
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at"); // created_at | name
  const [sortAsc, setSortAsc] = useState(false);
  const debouncedSearch = useDebounce(search, 400);

  // Selection (bulk actions)
  const [selectedIds, setSelectedIds] = useState([]);

  // App form
  const [selectedCategory, setSelectedCategory] = useState("");
  const [form, setForm] = useState({ published: true });
  const [editingId, setEditingId] = useState(null);
  const [screenshotInput, setScreenshotInput] = useState("");
  const [screenshots, setScreenshots] = useState([]);
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [loadingAppStoreInfo, setLoadingAppStoreInfo] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formDirtyRef = useRef(false);

  // Autosave draft
  useEffect(()=>{
    const key = "admin_app_draft";
    // load draft
    try {
      const d = JSON.parse(localStorage.getItem(key) || "null");
      if (d && !editingId) {
        setForm(d.form || {});
        setSelectedCategory(d.selectedCategory || "");
        setScreenshotInput(d.screenshotInput || "");
        setScreenshots(d.screenshots || []);
      }
    } catch {}
    const onBeforeUnload = (e)=>{
      if (formDirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return ()=>window.removeEventListener("beforeunload", onBeforeUnload);
  },[editingId]);
  useEffect(()=>{
    // save draft
    const key = "admin_app_draft";
    const payload = { form, selectedCategory, screenshotInput, screenshots };
    localStorage.setItem(key, JSON.stringify(payload));
  },[form,selectedCategory,screenshotInput,screenshots]);

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "", slug: "", enable_appstore_fetch: false,
    fields: [], // [{name,type,required,desc}]
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldDesc, setNewFieldDesc] = useState("");

  // Community (Firebase)
  const [comments, setComments] = useState([]);
  const [reports, setReports] = useState([]);

  // Dark mode persist
  useEffect(()=>{
    const saved = localStorage.getItem("adminDarkMode");
    const prefers = typeof window!=='undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const on = saved ? (saved==='true') : prefers;
    setDarkMode(on);
  },[]);
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("adminDarkMode", darkMode);
  },[darkMode]);

  // Auth & admin check (Supabase role)
  useEffect(()=>{
    (async ()=>{
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return router.push("/login");
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (!data || data?.role !== "admin") return router.push("/");
        setUser(user);
        await Promise.all([fetchCategories(), fetchApps()]);
      } catch (err) {
        console.error("[ADMIN] check error", err);
        setErrorMessage("Lỗi kiểm tra quyền admin");
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Firestore listeners (Community tab)
  useEffect(()=>{
    // chỉ bật khi tab community để giảm tải
    if (activeTab!=="community") return;
    const qComments = query(
      collection(db, "comments"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsubC = onSnapshot(qComments, (snap)=>{
      setComments(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    const qReports = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
      limit(100)
    );
    const unsubR = onSnapshot(qReports, (snap)=>{
      setReports(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    return ()=>{unsubC();unsubR();}
  },[activeTab]);

  // Fetch categories
  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error("[ADMIN] fetch categories", err);
      setErrorMessage("Lỗi tải danh sách chuyên mục");
    }
  }

  // Fetch apps (server-side search/sort/pagination + simple cache)
  async function fetchApps() {
    try {
      const params = {
        page, pageSize, sortBy, sortAsc,
        q: debouncedSearch?.trim() || ""
      };
      const key = JSON.stringify(params);
      if (appListCache.has(key)) {
        const cached = appListCache.get(key);
        setApps(cached.items);
        setTotalApps(cached.total);
        return;
      }

      let q1 = supabase.from("apps").select("*", { count: "exact" })
        .order(sortBy, { ascending: sortAsc })
        .range((page-1)*pageSize, (page*pageSize)-1);

      if (params.q) {
        // server-side search name/author/slug
        q1 = q1.or(`name.ilike.%${params.q}%,author.ilike.%${params.q}%,slug.ilike.%${params.q}%`);
      }

      const { data, error, count } = await q1;
      if (error) throw error;

      setApps(data || []);
      setTotalApps(count || 0);
      appListCache.set(key, { items: data||[], total: count||0 });
    } catch (err) {
      console.error("[ADMIN] fetch apps", err);
      setErrorMessage("Lỗi tải danh sách ứng dụng");
    }
  }
  useEffect(()=>{
    fetchApps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page, pageSize, sortBy, sortAsc, debouncedSearch]);

  // Derived
  const currentCategory = categories.find((c)=>c.id===selectedCategory);
  const currentFields = currentCategory?.fields || [];
  const pageCount = Math.max(1, Math.ceil((totalApps||0)/pageSize));

  // --- App actions ---
  function setDirty() { formDirtyRef.current = true; }
  function resetForm(keepCategory=false) {
    setForm({ published: true });
    setEditingId(null);
    if (!keepCategory) setSelectedCategory("");
    setScreenshotInput("");
    setScreenshots([]);
    setAppStoreUrl("");
    formDirtyRef.current = false;
  }
  function startEdit(app) {
    if (!isValidUUID(app.category_id)) {
      setErrorMessage("ID chuyên mục không hợp lệ");
      return;
    }
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
    setForm({ ...app });
    const list = Array.isArray(app.screenshots) ? app.screenshots : [];
    setScreenshots(list);
    setScreenshotInput(list.join("\n"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function togglePublished(app) {
    try {
      await supabase.from("apps").update({ published: !app.published, updated_at: new Date().toISOString() }).eq("id", app.id);
      show(app.published ? "Đã ẩn ứng dụng" : "Đã bật hiển thị");
      fetchApps();
    } catch (e) {
      setErrorMessage("Không thay đổi trạng thái được");
    }
  }
  async function duplicateApp(app) {
    try {
      const clone = { ...app };
      delete clone.id;
      clone.id = uuidv4();
      clone.slug = `${app.slug}-${Math.random().toString(36).slice(2,6)}`;
      clone.name = `${app.name} (copy)`;
      clone.created_at = new Date().toISOString();
      clone.updated_at = new Date().toISOString();
      await supabase.from("apps").insert([clone]);
      show("Đã nhân bản ứng dụng");
      fetchApps();
    } catch (e) {
      setErrorMessage("Lỗi khi nhân bản");
    }
  }
  async function bulkDelete() {
    if (selectedIds.length===0) return;
    const ok = window.confirm(`Xoá ${selectedIds.length} ứng dụng đã chọn?`);
    if (!ok) return;
    try {
      await supabase.from("apps").update({ deleted_at: new Date().toISOString() }).in("id", selectedIds); // soft delete
      setSelectedIds([]);
      show("Đã xoá mềm các ứng dụng");
      fetchApps();
    } catch (e) {
      setErrorMessage("Lỗi xoá hàng loạt");
    }
  }
  async function handleDelete(id) {
    // soft-delete + confirm modal "nặng"
    const ok = window.confirm("Xác nhận xoá mềm ứng dụng? (Có thể khôi phục trong DB)");
    if (!ok) return;
    try {
      await supabase.from("apps").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      await fetchApps();
      show("Đã xoá mềm");
    } catch (err) {
      console.error("Delete app error:", err);
      setErrorMessage("Lỗi khi xoá ứng dụng");
    }
  }

  // Validate helpers
  const validators = {
    url: (s) => /^https?:\/\//i.test(s || ""),
    version: (s)=> /^[0-9]+(\.[0-9]+){0,3}$/.test((s||"").trim()),
    minOS: (s)=> /^[0-9]+(\.[0-9]+){0,2}$/.test((s||"").trim()),
  };
  function validateAppPayload(payload) {
    // required by category fields
    for (const f of currentFields) {
      if (f.required && !payload[f.name]) return `${f.name} là bắt buộc`;
      if (f.type === "url" && payload[f.name] && !validators.url(payload[f.name])) return `${f.name} phải là URL hợp lệ`;
      if (f.type === "date" && payload[f.name] && isNaN(Date.parse(payload[f.name]))) return `${f.name} không phải ngày hợp lệ`;
      if (f.type === "number" && payload[f.name] && isNaN(Number(payload[f.name]))) return `${f.name} phải là số`;
    }
    // built-ins
    if (payload.icon_url && !validators.url(payload.icon_url)) return "icon_url không hợp lệ";
    if (payload.version && !validators.version(payload.version)) return "version không hợp lệ (vd: 1.2.3)";
    if (payload.minimum_os_version && !validators.minOS(payload.minimum_os_version)) return "minimum_os_version không hợp lệ (vd: 12.0)";
    return null;
  }

  // Submit app
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setErrorMessage("");
    try {
      if (!selectedCategory || !isValidUUID(selectedCategory)) {
        throw new Error("Vui lòng chọn chuyên mục hợp lệ");
      }
      // screenshots from state
      const screenshotsClean = uniqueArray(
        (screenshotInput ? screenshotInput.split(/[\n,]+/):[])
        .map((u)=>u.trim()).filter((u)=>u && validators.url(u))
      );
      const normalizeToArray = (v) =>
        Array.isArray(v) ? v :
        (v||"").toString().split(/[,\n]+/).map((s)=>s.trim()).filter(Boolean);

      const base = {
        ...form,
        category_id: selectedCategory,
        screenshots: screenshotsClean,
        languages: normalizeToArray(form.languages),
        supported_devices: normalizeToArray(form.supported_devices),
        updated_at: new Date().toISOString(),
        slug: form.name ? createSlug(form.name) : uuidv4(),
      };

      // check slug unique
      const { data: slugCheck } = await supabase.from("apps").select("id").eq("slug", base.slug).neq("id", editingId || "");
      if (slugCheck && slugCheck.length>0) throw new Error("Slug đã tồn tại, vui lòng đổi tên ứng dụng");

      const msg = validateAppPayload(base);
      if (msg) throw new Error(msg);

      if (editingId) {
        await supabase.from("apps").update(base).eq("id", editingId);
        show("Cập nhật thành công!");
      } else {
        await supabase.from("apps").insert([{
          ...base, id: uuidv4(), created_at: new Date().toISOString()
        }]);
        show("Thêm mới thành công!");
      }
      resetForm(true);
      await fetchApps();
    } catch (err) {
      console.error("[ADMIN] submit app", err);
      setErrorMessage(err.message || "Lỗi khi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  // App Store autofill (cache + rate limit by url)
  async function fetchAppStoreInfo() {
    if (!appStoreUrl.trim()) return setErrorMessage("Vui lòng nhập URL AppStore");
    if (!appStoreUrl.includes("apps.apple.com")) return setErrorMessage("URL phải là apps.apple.com");
    setLoadingAppStoreInfo(true); setErrorMessage("");
    try {
      if (appStoreCache.has(appStoreUrl)) {
        const data = appStoreCache.get(appStoreUrl);
        applyAppStoreData(data);
        show("Đã lấy từ cache");
        return;
      }
      const res = await fetch("/api/admin/appstore-info", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: appStoreUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lỗi server appstore-info");
      appStoreCache.set(appStoreUrl, data);
      applyAppStoreData(data);
      show("Đã lấy thông tin App Store");
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoadingAppStoreInfo(false);
    }
  }
  function applyAppStoreData(data) {
    const mapped = {
      name: data.name || "",
      author: data.author || "",
      size: data.size || "",
      description: data.description || "",
      version: data.version || "",
      icon_url: data.icon || "",
      minimum_os_version: data.minimumOsVersion || "",
      age_rating: data.ageRating || "",
      release_date: data.releaseDate ? new Date(data.releaseDate).toISOString().split("T")[0] : "",
      supported_devices: Array.isArray(data.supportedDevices) ? data.supportedDevices.join(", ") : "",
      languages: Array.isArray(data.languages) ? data.languages.join(", ") : "",
    };
    setForm((prev)=>({ ...prev, ...mapped }));
    const snaps = Array.isArray(data.screenshots) ? data.screenshots : [];
    setScreenshots(snaps);
    setScreenshotInput(snaps.join("\n"));
    setAppStoreUrl("");
    formDirtyRef.current = true;
  }

  // IPA size probe
  async function probeIpaSize() {
    try {
      const plistName = (form["download_link"]||"").trim();
      if (!plistName) return setErrorMessage("Chưa có tên IPA (download_link)");
      const tokenRes = await fetch(`/api/generate-token`, {
        method:"POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ ipa_name: plistName }),
      });
      const { token } = await tokenRes.json();
      if (!token) throw new Error("Không nhận được token");
      const plistUrl = `/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${token}`;
      const plistResp = await fetch(plistUrl);
      const plistText = await plistResp.text();
      const m = plistText.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
      if (!m) throw new Error("Không tìm thấy URL IPA trong plist");
      const ipaUrl = m[1];
      const sizeRes = await fetch(`/api/admin/get-size-ipa?url=${encodeURIComponent(ipaUrl)}`);
      const { size, error } = await sizeRes.json();
      if (error || !size) throw new Error(error || "Không nhận được kích thước");
      setForm((prev)=>({ ...prev, size: `${(size/(1024*1024)).toFixed(2)} MB` }));
      show("Đã tính kích thước IPA");
    } catch (e) {
      setErrorMessage(e.message);
      setForm((prev)=>({ ...prev, size: `Lỗi: ${e.message}` }));
    }
  }

  // Screenshots reorder (drag-less: move up/down)
  function moveShot(i, dir) {
    const arr = [...screenshots];
    const j = dir==="up" ? i-1 : i+1;
    if (j<0 || j>=arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setScreenshots(arr);
    setScreenshotInput(arr.join("\n"));
    setDirty();
  }
  function removeShot(i) {
    const arr = screenshots.filter((_,idx)=> idx!==i);
    setScreenshots(arr);
    setScreenshotInput(arr.join("\n"));
    setDirty();
  }

  // Category helpers
  function addField() {
    const name = newFieldName.trim();
    if (!name) return;
    if (!/^[a-z0-9_]+$/i.test(name)) { setErrorMessage("Tên field chỉ gồm chữ/số/_"); return; }
    setCategoryForm(prev=>({
      ...prev,
      fields: [...(prev.fields||[]), { name, type: newFieldType, required: !!newFieldRequired, desc: newFieldDesc.trim() }]
    }));
    setNewFieldName(""); setNewFieldType("text"); setNewFieldRequired(false); setNewFieldDesc("");
  }
  function removeField(index) {
    setCategoryForm(prev=>({ ...prev, fields: prev.fields.filter((_,i)=>i!==index) }));
  }
  function moveField(i, dir) {
    const arr = [...(categoryForm.fields||[])];
    const j = dir==="up" ? i-1 : i+1; if (j<0 || j>=arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setCategoryForm(prev=>({ ...prev, fields: arr }));
  }

  // Category submit
  async function handleCategorySubmit(e) {
    e.preventDefault(); setSubmitting(true); setErrorMessage("");
    try {
      const payload = {
        name: categoryForm.name.trim(),
        slug: categoryForm.slug?.trim() || createSlug(categoryForm.name),
        enable_appstore_fetch: !!categoryForm.enable_appstore_fetch,
        fields: categoryForm.fields || [],
      };
      if (!payload.name) throw new Error("Tên chuyên mục bắt buộc");
      // slug unique
      const { data: s } = await supabase.from("categories").select("id").eq("slug", payload.slug).neq("id", editingCategoryId||"");
      if (s && s.length>0) throw new Error("Slug chuyên mục đã tồn tại");

      if (editingCategoryId) {
        await supabase.from("categories").update(payload).eq("id", editingCategoryId);
        show("Đã cập nhật chuyên mục");
      } else {
        await supabase.from("categories").insert([{ ...payload, id: uuidv4() }]);
        show("Đã thêm chuyên mục");
      }
      setCategoryForm({ name:"", slug:"", fields:[], enable_appstore_fetch:false });
      setEditingCategoryId(null);
      await fetchCategories();
    } catch (err) {
      setErrorMessage(err.message || "Lỗi khi lưu chuyên mục");
    } finally {
      setSubmitting(false);
    }
  }
  function handleEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      slug: category.slug || "",
      fields: Array.isArray(category.fields) ? [...category.fields] : [],
      enable_appstore_fetch: !!category.enable_appstore_fetch,
    });
    goTab("categories");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function handleDeleteCategory(id) {
    const ok = window.confirm("Xoá chuyên mục sẽ (soft-delete) toàn bộ ứng dụng thuộc chuyên mục này. Xác nhận?");
    if (!ok) return;
    try {
      await supabase.from("apps").update({ deleted_at: new Date().toISOString() }).eq("category_id", id);
      await supabase.from("categories").delete().eq("id", id); // xóa category (ứng dụng vẫn soft-delete để recover)
      await Promise.all([fetchCategories(), fetchApps()]);
      show("Đã xoá chuyên mục và ẩn các ứng dụng thuộc về");
    } catch (err) {
      setErrorMessage("Lỗi khi xoá chuyên mục");
    }
  }

  // Export / Import
  async function exportData() {
    const res = await fetch("/api/admin/export");
    if (!res.ok) { setErrorMessage("Lỗi export"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`storeios-admin-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const res = await fetch("/api/admin/import", { method:"POST", headers:{ "Content-Type":"application/json" }, body:text });
    if (!res.ok) { setErrorMessage("Import thất bại"); return; }
    show("Import thành công");
    await Promise.all([fetchCategories(), fetchApps()]);
  }

  // Community moderation
  async function hideComment(c) {
    try {
      await updateDoc(doc(db,"comments",c.id), { hidden: true });
      show("Đã ẩn bình luận");
    } catch { setErrorMessage("Không ẩn được bình luận"); }
  }
  async function deleteComment(c) {
    const ok = window.confirm("Xoá bình luận vĩnh viễn?");
    if (!ok) return;
    try {
      await deleteDoc(doc(db,"comments",c.id));
      show("Đã xoá bình luận");
    } catch { setErrorMessage("Không xoá được bình luận"); }
  }

  // --- Render ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
        Đang tải dữ liệu quản trị...
      </div>
    );
  }

  return (
    <>
      <Head><title>Admin • StoreiOS</title></Head>
      <style jsx global>{`
        /* Ngăn iOS zoom: luôn >= 16px */
        input, select, textarea { font-size:16px; }
        /* Bảng đẹp hơn trên mobile */
        @media (max-width: 768px){
          .table-wrapper { display:block; overflow-x:auto; }
          table thead { display:none; }
          table tr { display:block; margin-bottom:12px; border:1px solid rgba(0,0,0,0.06); border-radius:8px; }
          table td { display:flex; justify-content:space-between; padding:10px 12px; }
          table td::before { content: attr(data-label); font-weight:600; }
        }
      `}</style>

      <div className={`min-h-screen flex transition-colors duration-300 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-800"}`}>
        {/* Sidebar */}
        <aside className="w-64 hidden md:flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2"><FontAwesomeIcon icon={faGauge}/> Admin</h2>
            <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode?faSun:faMoon}/>
            </button>
          </div>
          <nav className="p-3 space-y-2">
            {["dashboard","apps","categories","community"].map(t=>(
              <button key={t} onClick={()=>goTab(t)}
                className={`w-full text-left px-4 py-2 rounded ${activeTab===t?"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200":"hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                {t==="dashboard"?"Tổng quan": t==="apps"?"Ứng dụng": t==="categories"?"Chuyên mục":"Cộng đồng"}
              </button>
            ))}
          </nav>
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="ml-2 truncate">{user?.email}</span>
            <button onClick={async()=>{ await supabase.auth.signOut(); router.push("/login"); }}
              className="ml-auto text-red-500 hover:text-red-600" title="Đăng xuất">
              <FontAwesomeIcon icon={faSignOutAlt} size="lg"/>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24">
          {/* Header Mobile */}
          <div className="md:hidden mb-4 flex items-center justify-between">
            <div className="font-bold text-lg">Admin</div>
            <button onClick={()=>setDarkMode(!darkMode)} className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode?faSun:faMoon}/>
            </button>
          </div>

          {/* Toast */}
          <Toast item={toast}/>

          {/* Error banner */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-r-md flex justify-between">
              <span><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>{errorMessage}</span>
              <button onClick={()=>setErrorMessage("")}><FontAwesomeIcon icon={faXmark}/></button>
            </div>
          )}

          {/* ===== Dashboard ===== */}
          {activeTab==="dashboard" && (
            <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label:"Tổng số ứng dụng", value: totalApps || 0 },
                { label:"Số chuyên mục", value: categories.length },
                { label:"Bình luận gần đây (24h)", value: comments.filter(c=> Date.now() - (c.createdAt?.toMillis?.()||0) < 86400000).length }
              ].map((k,i)=>(
                <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-5 shadow">
                  <div className="text-sm text-gray-500 mb-1">{k.label}</div>
                  <div className="text-2xl font-bold">{k.value}</div>
                </div>
              ))}
              <div className="md:col-span-3 bg-white dark:bg-gray-800 rounded-lg p-5 shadow flex flex-wrap gap-2">
                <button onClick={exportData} className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCloudDownloadAlt}/> Export JSON
                </button>
                <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2 cursor-pointer">
                  <FontAwesomeIcon icon={faCloudUploadAlt}/> Import JSON
                  <input type="file" accept=".json" onChange={importData} className="hidden"/>
                </label>
                <button onClick={()=>{ appListCache.clear(); show("Đã refresh cache"); fetchApps(); }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowRotateRight}/> Làm mới
                </button>
              </div>
            </section>
          )}

          {/* ===== Apps ===== */}
          {activeTab==="apps" && (
            <>
              {/* Form App */}
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={editingId ? faEdit : faPlus} />
                  {editingId ? "Sửa ứng dụng" : "Thêm ứng dụng mới"}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => { const v=e.target.value; setSelectedCategory(v); setEditingId(null); setForm({ category_id:v, published:true }); setScreenshotInput(""); setScreenshots([]); setAppStoreUrl(""); setErrorMessage(""); setDirty(); }}
                      className={inputBaseClass} required
                    >
                      <option value="">-- Chọn chuyên mục --</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* App Store autofill */}
                  {selectedCategory && currentCategory?.enable_appstore_fetch && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <h3 className="text-md font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
                        <FontAwesomeIcon icon={faSync} /> Lấy thông tin từ App Store
                      </h3>
                      <div className="flex gap-2">
                        <input type="url" value={appStoreUrl} onChange={(e)=>setAppStoreUrl(e.target.value)}
                          placeholder="Nhập URL App Store..." className={`${inputBaseClass} flex-1`} disabled={loadingAppStoreInfo}/>
                        <button type="button" onClick={fetchAppStoreInfo} disabled={loadingAppStoreInfo || !appStoreUrl.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2">
                          {loadingAppStoreInfo ? (<><FontAwesomeIcon icon={faSpinner} spin/> Đang lấy...</>) : (<>Get Info</>)}
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">Tự động điền các trường bên dưới.</p>
                    </div>
                  )}

                  {/* Dynamic fields */}
                  {selectedCategory && currentFields.map((f, idx)=>(
                    <div key={`${f.name}-${idx}`}>
                      <label className="block text-sm font-medium mb-1">
                        {f.name} {f.required && <span className="text-red-600">*</span>}
                        {f.desc && <span className="ml-2 text-xs text-gray-500">({f.desc})</span>}
                      </label>
                      {f.type==="text" && (
                        <input type="text" value={form[f.name]||""}
                          onChange={(e)=>{ setForm(prev=>({...prev,[f.name]:e.target.value})); setDirty(); }}
                          className={inputBaseClass}/>
                      )}
                      {f.type==="number" && (
                        <input type="number" value={form[f.name]||""}
                          onChange={(e)=>{ setForm(prev=>({...prev,[f.name]:e.target.value})); setDirty(); }}
                          className={inputBaseClass}/>
                      )}
                      {f.type==="url" && (
                        <input type="url" value={form[f.name]||""}
                          onChange={(e)=>{ setForm(prev=>({...prev,[f.name]:e.target.value})); setDirty(); }}
                          className={inputBaseClass} placeholder="https://..."/>
                      )}
                      {f.type==="date" && (
                        <input type="date" value={form[f.name]||""}
                          onChange={(e)=>{ setForm(prev=>({...prev,[f.name]:e.target.value})); setDirty(); }}
                          className={inputBaseClass}/>
                      )}
                      {f.type==="array" && (
                        <textarea rows={3} value={Array.isArray(form[f.name])?form[f.name].join(", "):(form[f.name]||"")}
                          onChange={(e)=>{ setForm(prev=>({...prev,[f.name]:e.target.value})); setDirty(); }}
                          className={inputBaseClass} placeholder="Nhập nhiều giá trị, cách nhau bởi dấu phẩy"/>
                      )}
                    </div>
                  ))}

                  {/* Built-in extras */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug (auto):</label>
                      <input type="text" value={form.slug||""}
                        onChange={(e)=>{ setForm(prev=>({...prev,slug:e.target.value})); setDirty(); }}
                        className={inputBaseClass} placeholder="tên-khong-dau"/>
                    </div>
                    <div className="flex items-center gap-2">
                      <input id="published" type="checkbox" checked={!!form.published}
                        onChange={(e)=>{ setForm(prev=>({...prev,published:e.target.checked})); setDirty(); }}/>
                      <label htmlFor="published" className="text-sm">Hiển thị (published)</label>
                    </div>
                  </div>

                  {/* Screenshots field */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Screenshots (mỗi URL 1 dòng):</label>
                    <textarea rows={4} value={screenshotInput}
                      onChange={(e)=>{ setScreenshotInput(e.target.value); setScreenshots(e.target.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)); setDirty(); }}
                      className={inputBaseClass}/>
                    {screenshots.length>0 && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {screenshots.map((u,i)=>(
                          <div key={i} className="relative group">
                            <img src={u} alt="" className="w-full h-28 object-cover rounded"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 rounded transition"/>
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button type="button" title="Lên" onClick={()=>moveShot(i,"up")}
                                className="px-2 py-1 bg-white/90 rounded text-xs">↑</button>
                              <button type="button" title="Xuống" onClick={()=>moveShot(i,"down")}
                                className="px-2 py-1 bg-white/90 rounded text-xs">↓</button>
                              <button type="button" title="Xoá" onClick={()=>removeShot(i)}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs"><FontAwesomeIcon icon={faTrash}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tool row */}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={probeIpaSize}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2">
                      Tính size IPA
                    </button>
                    {editingId && (
                      <button type="button" onClick={()=>{ resetForm(true); show("Đã hủy chỉnh sửa"); }}
                        className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Hủy
                      </button>
                    )}
                  </div>

                  {/* Submit */}
                  <div className="flex gap-4 pt-2">
                    <button type="submit" disabled={submitting || !selectedCategory}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                      {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin/> Đang lưu...</>) : (
                        editingId ? (<><FontAwesomeIcon icon={faSave}/> Cập nhật</>) : (<><FontAwesomeIcon icon={faPlus}/> Thêm mới</>)
                      )}
                    </button>
                  </div>
                </form>
              </section>

              {/* Apps list */}
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg md:text-xl font-semibold">Danh sách ứng dụng</h2>
                    {selectedIds.length>0 && (
                      <div className="px-3 py-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-sm">
                        Đã chọn {selectedIds.length}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64 max-w-[70vw]">
                      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="text" placeholder="Tìm kiếm..." value={search}
                        onChange={(e)=>{ setSearch(e.target.value); setPage(1); }}
                        className={`${inputBaseClass} pl-10`}/>
                    </div>
                    <select value={sortBy} onChange={(e)=>{ setSortBy(e.target.value); setPage(1); }}
                      className={inputBaseClass}>
                      <option value="created_at">Mới nhất</option>
                      <option value="name">Tên (A→Z)</option>
                    </select>
                    <button onClick={()=>setSortAsc(!sortAsc)} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">
                      {sortAsc?"↑":"↓"}
                    </button>
                    {selectedIds.length>0 && (
                      <button onClick={bulkDelete}
                        className="px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-2">
                        <FontAwesomeIcon icon={faTrash}/> Xoá đã chọn
                      </button>
                    )}
                  </div>
                </div>

                <div className="table-wrapper overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-medium">
                          <input type="checkbox"
                            checked={apps.length>0 && selectedIds.length===apps.length}
                            onChange={(e)=>{
                              setSelectedIds(e.target.checked ? apps.map(a=>a.id) : []);
                            }}/>
                        </th>
                        <th className="text-left p-3 font-medium">Tên</th>
                        <th className="text-left p-3 font-medium">Chuyên mục</th>
                        <th className="text-left p-3 font-medium">Ngày tạo</th>
                        <th className="text-left p-3 font-medium">Trạng thái</th>
                        <th className="text-left p-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps===null && Array.from({length:5}).map((_,i)=><SkeletonRow key={i}/>)}
                      {Array.isArray(apps) && apps.map((app)=>(
                        <tr key={app.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3" data-label="">
                            <input type="checkbox"
                              checked={selectedIds.includes(app.id)}
                              onChange={(e)=>{
                                setSelectedIds((ids)=> e.target.checked ? [...ids, app.id] : ids.filter(x=>x!==app.id));
                              }}/>
                          </td>
                          <td className="p-3" data-label="Tên">
                            <div className="flex items-center gap-3">
                              {app.icon_url && (<img src={app.icon_url} alt="" className="w-8 h-8 rounded"/>)}
                              <div className="font-medium">{app.name || "Không có tên"}</div>
                            </div>
                          </td>
                          <td className="p-3" data-label="Chuyên mục">
                            {categories.find((c)=>c.id===app.category_id)?.name || "N/A"}
                          </td>
                          <td className="p-3" data-label="Ngày tạo">
                            {app.created_at ? new Date(app.created_at).toLocaleDateString("vi-VN") : "N/A"}
                          </td>
                          <td className="p-3" data-label="Trạng thái">
                            <button onClick={()=>togglePublished(app)}
                              className={`px-3 py-1 rounded text-xs ${app.published?'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-100':'bg-gray-200 dark:bg-gray-700'}`}>
                              {app.published ? <><FontAwesomeIcon icon={faEye}/> Hiển thị</> : <><FontAwesomeIcon icon={faEyeSlash}/> Ẩn</>}
                            </button>
                          </td>
                          <td className="p-3" data-label="Thao tác">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={()=>startEdit(app)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center gap-1">
                                <FontAwesomeIcon icon={faEdit}/> Sửa
                              </button>
                              <button onClick={()=>duplicateApp(app)}
                                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 flex items-center gap-1">
                                <FontAwesomeIcon icon={faCopy}/> Nhân bản
                              </button>
                              <Link href={`/app/${app.slug}`} target="_blank"
                                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-1">
                                Xem
                              </Link>
                              <button onClick={()=>handleDelete(app.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                <FontAwesomeIcon icon={faTrash}/> Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {Array.isArray(apps) && apps.length===0 && (
                        <tr><td colSpan={6} className="py-10 text-center text-gray-500">
                          Chưa có ứng dụng nào. <button onClick={()=>window.scrollTo({top:0,behavior:"smooth"})} className="underline">Thêm ứng dụng đầu tiên</button>.
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">Trước</button>
                  <div className="text-sm">Trang {page}/{pageCount}</div>
                  <button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}
                    className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-50">Sau</button>
                </div>
              </section>
            </>
          )}

          {/* ===== Categories ===== */}
          {activeTab==="categories" && (
            <>
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={editingCategoryId ? faEdit : faPlus} />
                  {editingCategoryId ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}
                </h2>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên chuyên mục:</label>
                      <input type="text" value={categoryForm.name}
                        onChange={(e)=>setCategoryForm(prev=>({...prev, name:e.target.value}))}
                        className={inputBaseClass} required/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug (tùy chọn):</label>
                      <input type="text" value={categoryForm.slug}
                        onChange={(e)=>setCategoryForm(prev=>({...prev, slug:e.target.value}))}
                        className={inputBaseClass}/>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input id="enable_appstore_fetch" type="checkbox" checked={!!categoryForm.enable_appstore_fetch}
                      onChange={(e)=>setCategoryForm(prev=>({...prev, enable_appstore_fetch: e.target.checked}))}
                      className="h-4 w-4"/>
                    <label htmlFor="enable_appstore_fetch" className="text-sm">Bật tự động lấy thông tin từ App Store</label>
                  </div>

                  <div className="p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="font-semibold mb-2">Trường dữ liệu</div>
                    <div className="grid md:grid-cols-4 gap-2">
                      <input type="text" value={newFieldName} onChange={(e)=>setNewFieldName(e.target.value)}
                        placeholder="name / author / icon_url ..." className={inputBaseClass}/>
                      <select value={newFieldType} onChange={(e)=>setNewFieldType(e.target.value)} className={inputBaseClass}>
                        <option value="text">Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="url">URL</option>
                        <option value="array">Array</option>
                      </select>
                      <label className="flex items-center gap-2">
                        <input type="checkbox" checked={newFieldRequired} onChange={(e)=>setNewFieldRequired(e.target.checked)}/>
                        Bắt buộc
                      </label>
                      <input type="text" value={newFieldDesc} onChange={(e)=>setNewFieldDesc(e.target.value)}
                        placeholder="Mô tả (tùy chọn)" className={inputBaseClass}/>
                    </div>
                    <div className="mt-2">
                      <button type="button" onClick={addField}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <FontAwesomeIcon icon={faPlus}/> Thêm field
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(categoryForm.fields||[]).map((f, i)=>(
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{f.name}</div>
                            <div className="text-xs text-gray-500">{f.type}{f.required?" • bắt buộc":""}{f.desc?` • ${f.desc}`:""}</div>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" title="Lên" onClick={()=>moveField(i,"up")}
                              className="px-2 py-1 bg-white dark:bg-gray-600 rounded border text-xs">↑</button>
                            <button type="button" title="Xuống" onClick={()=>moveField(i,"down")}
                              className="px-2 py-1 bg-white dark:bg-gray-600 rounded border text-xs">↓</button>
                            <button type="button" onClick={()=>removeField(i)}
                              className="px-2 py-1 bg-red-600 text-white rounded text-xs"><FontAwesomeIcon icon={faTimes}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" disabled={submitting || !categoryForm.name.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                      {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin/> Đang lưu...</>) :
                        (editingCategoryId ? (<><FontAwesomeIcon icon={faSave}/> Cập nhật</>) : (<><FontAwesomeIcon icon={faPlus}/> Thêm mới</>))}
                    </button>
                    {editingCategoryId && (
                      <button type="button" onClick={()=>{ setEditingCategoryId(null); setCategoryForm({ name:"", slug:"", fields:[], enable_appstore_fetch:false }); }}
                        className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* categories list */}
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-lg md:text-xl font-semibold mb-4">Danh sách chuyên mục</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-medium">Tên</th>
                        <th className="text-left p-3 font-medium">Slug</th>
                        <th className="text-left p-3 font-medium">AppStore Fetch</th>
                        <th className="text-left p-3 font-medium">Số field</th>
                        <th className="text-left p-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((category)=>(
                        <tr key={category.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3 font-medium">{category.name}</td>
                          <td className="p-3">{category.slug || "-"}</td>
                          <td className="p-3">{category.enable_appstore_fetch ? "Bật" : "Tắt"}</td>
                          <td className="p-3">{category.fields?.length || 0}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button onClick={()=>handleEditCategory(category)}
                                className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600 flex items-center gap-1">
                                <FontAwesomeIcon icon={faEdit}/> Sửa
                              </button>
                              <button onClick={()=>handleDeleteCategory(category.id)}
                                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 flex items-center gap-1">
                                <FontAwesomeIcon icon={faTrash}/> Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {categories.length===0 && (
                        <tr><td colSpan={5} className="py-10 text-center text-gray-500">Chưa có chuyên mục</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}

          {/* ===== Community (Firebase) ===== */}
          {activeTab==="community" && (
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-3">Bình luận mới</h3>
                <div className="space-y-3 max-h-[70vh] overflow-auto">
                  {comments.map(c=>(
                    <div key={c.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-sm text-gray-500">{c.userName || c.userId}</div>
                      <div className="mt-1">{c.text || c.content}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(c.createdAt?.toMillis?.() || Date.now()).toLocaleString("vi-VN")}</div>
                      <div className="flex gap-2 mt-2">
                        {!c.hidden ? (
                          <button onClick={()=>hideComment(c)} className="px-3 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded"><FontAwesomeIcon icon={faEyeSlash}/> Ẩn</button>
                        ) : (
                          <span className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded">Đã ẩn</span>
                        )}
                        <button onClick={()=>deleteComment(c)} className="px-3 py-1 text-xs bg-red-600 text-white rounded"><FontAwesomeIcon icon={faTrash}/> Xoá</button>
                      </div>
                    </div>
                  ))}
                  {comments.length===0 && <div className="text-gray-500">Không có bình luận</div>}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-3">Báo cáo nội dung</h3>
                <div className="space-y-3 max-h-[70vh] overflow-auto">
                  {reports.map(r=>(
                    <div key={r.id} className="p-3 rounded border border-gray-200 dark:border-gray-700">
                      <div className="text-sm">{r.reason || "Không rõ lý do"}</div>
                      <div className="text-xs text-gray-500 mt-1">By: {r.userId}</div>
                      <div className="text-xs text-gray-400 mt-1">{new Date(r.createdAt?.toMillis?.() || Date.now()).toLocaleString("vi-VN")}</div>
                    </div>
                  ))}
                  {reports.length===0 && <div className="text-gray-500">Không có báo cáo</div>}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}