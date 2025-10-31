// pages/admin/index.js
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { supabase } from "../../lib/supabase";
import { v4 as uuidv4 } from "uuid";
import { auth, db } from "../../lib/firebase-client";
import {
  collection, query as fbQuery, orderBy, limit, onSnapshot,
  doc, updateDoc, deleteDoc
} from "firebase/firestore";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus, faEdit, faTrash, faSave, faTimes, faSpinner,
  faBoxOpen, faFolder, faShieldAlt, faSun, faMoon,
  faSignOutAlt, faSearch, faExclamationTriangle,
  faEye, faEyeSlash, faCopy, faBars
} from "@fortawesome/free-solid-svg-icons";

// ======= TÙY CHỌN =======
const HAS_TOOLS = false; // Bật = true nếu bạn đã tạo API appstore-info & get-size-ipa
// ========================

const inputBase = "w-full px-4 py-3 text-[16px] border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500";
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id) => id && uuidRegex.test(id);
const createSlug = (name = "") => name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").trim();
const unique = (arr)=>Array.from(new Set(arr));
const validators = {
  url: (s) => /^https?:\/\//i.test(s || ""),
  version: (s)=> /^[0-9]+(\.[0-9]+){0,3}$/.test((s||"").trim()),
  minOS: (s)=> /^[0-9]+(\.[0-9]+){0,2}$/.test((s||"").trim()),
};

export default function Admin() {
  const router = useRouter();

  // Auth
  const [user, setUser] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState("apps"); // dashboard | apps | categories | community
  const goTab = (t) => {
    setActiveTab(t);
    router.replace({ pathname: "/admin", query: { tab: t } }, undefined, { shallow: true });
  };
  useEffect(()=>{
    const t = (router.query.tab || "apps").toString(); // MẶC ĐỊNH: apps
    setActiveTab(t);
  }, [router.query.tab]);

  // UI
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // luôn mở mặc định
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // Data
  const [apps, setApps] = useState([]);
  const [totalApps, setTotalApps] = useState(0);
  const [categories, setCategories] = useState([]);

  // Paging / search / sort
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  // Selection
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

  // Category form
  const [categoryForm, setCategoryForm] = useState({
    name: "", slug: "", enable_appstore_fetch: false, fields: []
  });
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldDesc, setNewFieldDesc] = useState("");

  // Community (Firebase)
  const [comments, setComments] = useState([]);

  // Dark mode persist
  useEffect(()=>{
    const saved = localStorage.getItem("adminDarkMode");
    const prefers = typeof window!=='undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(saved ? saved==='true' : prefers);
  },[]);
  useEffect(()=>{
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("adminDarkMode", darkMode);
  },[darkMode]);

  // Auth check
  useEffect(()=>{
    (async ()=>{
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return router.push("/login");
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        if (!data || data?.role !== "admin") return router.push("/");
        setUser(user);
        await Promise.all([fetchCategories(), fetchApps()]);
      } catch (e) {
        setErrorMessage("Lỗi kiểm tra quyền admin");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Firebase comments (chỉ khi mở tab community)
  useEffect(()=>{
    if (activeTab!=="community") return;
    const q = fbQuery(collection(db,"comments"), orderBy("createdAt","desc"), limit(100));
    const unsub = onSnapshot(q, (snap)=>{
      setComments(snap.docs.map(d=>({ id:d.id, ...d.data() })));
    });
    return ()=>unsub();
  },[activeTab]);

  async function fetchCategories() {
    try {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      setCategories(data||[]);
    } catch (e) {
      setErrorMessage("Lỗi tải danh sách chuyên mục");
    }
  }
  async function fetchApps() {
    try {
      let q = supabase.from("apps").select("*", { count: "exact" })
        .order(sortBy, { ascending: sortAsc })
        .range((page-1)*pageSize, (page*pageSize)-1);
      if (search.trim()) {
        q = q.or(`name.ilike.%${search.trim()}%,author.ilike.%${search.trim()}%,slug.ilike.%${search.trim()}%`);
      }
      const { data, error, count } = await q;
      if (error) throw error;
      setApps(data||[]);
      setTotalApps(count||0);
    } catch (e) {
      setErrorMessage("Lỗi tải danh sách ứng dụng");
    }
  }
  useEffect(()=>{
    fetchApps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[page, sortBy, sortAsc, search]);

  const pageCount = Math.max(1, Math.ceil((totalApps||0)/pageSize));
  const currentCategory = categories.find(c=>c.id===selectedCategory);
  const currentFields = currentCategory?.fields || [];

  // ===== App Actions
  function startEdit(app) {
    if (!isValidUUID(app.category_id)) {
      setErrorMessage("ID chuyên mục không hợp lệ");
      return;
    }
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
    setForm({ ...app });
    const arr = Array.isArray(app.screenshots)? app.screenshots : [];
    setScreenshots(arr);
    setScreenshotInput(arr.join("\n"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function resetForm(keepCategory=false) {
    setForm({ published:true });
    setEditingId(null);
    if (!keepCategory) setSelectedCategory("");
    setScreenshotInput("");
    setScreenshots([]);
    setAppStoreUrl("");
  }
  async function togglePublished(app) {
    try {
      await supabase.from("apps").update({ published: !app.published, updated_at: new Date().toISOString() }).eq("id", app.id);
      fetchApps();
    } catch { setErrorMessage("Không đổi trạng thái được"); }
  }
  async function duplicateApp(app) {
    try {
      const clone = { ...app };
      delete clone.id;
      clone.id = uuidv4();
      clone.slug = `${app.slug}-${Math.random().toString(36).slice(2,5)}`;
      clone.name = `${app.name} (copy)`;
      clone.created_at = new Date().toISOString();
      clone.updated_at = new Date().toISOString();
      await supabase.from("apps").insert([clone]);
      fetchApps();
    } catch { setErrorMessage("Lỗi nhân bản"); }
  }
  async function handleDelete(id) {
    if (!confirm("Xác nhận xoá ứng dụng (soft-delete trong DB)?")) return;
    try {
      await supabase.from("apps").update({ deleted_at: new Date().toISOString() }).eq("id", id);
      fetchApps();
    } catch {
      setErrorMessage("Lỗi khi xoá ứng dụng");
    }
  }
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true); setErrorMessage("");
    try {
      if (!selectedCategory || !isValidUUID(selectedCategory)) throw new Error("Vui lòng chọn chuyên mục hợp lệ");

      const screenshotsClean = unique(
        (screenshotInput? screenshotInput.split(/[\n,]+/) : [])
          .map(u=>u.trim()).filter(u=>u && validators.url(u))
      );
      const normalizeArr = (v)=> Array.isArray(v)? v : (v||"").toString().split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);

      const payload = {
        ...form,
        category_id: selectedCategory,
        screenshots: screenshotsClean,
        languages: normalizeArr(form.languages),
        supported_devices: normalizeArr(form.supported_devices),
        updated_at: new Date().toISOString(),
        slug: form.name ? createSlug(form.name) : uuidv4(),
      };

      // slug unique
      const { data: s } = await supabase.from("apps").select("id").eq("slug", payload.slug).neq("id", editingId||"");
      if (s && s.length>0) throw new Error("Slug đã tồn tại, đổi tên ứng dụng");

      // validate cơ bản theo type
      for (const f of currentFields) {
        if (f.required && !payload[f.name]) throw new Error(`${f.name} là bắt buộc`);
        if (f.type==="url" && payload[f.name] && !validators.url(payload[f.name])) throw new Error(`${f.name} phải là URL hợp lệ`);
        if (f.type==="date" && payload[f.name] && isNaN(Date.parse(payload[f.name]))) throw new Error(`${f.name} không phải ngày hợp lệ`);
        if (f.type==="number" && payload[f.name] && isNaN(Number(payload[f.name]))) throw new Error(`${f.name} phải là số`);
      }
      if (payload.icon_url && !validators.url(payload.icon_url)) throw new Error("icon_url không hợp lệ");
      if (payload.version && !validators.version(payload.version)) throw new Error("version không hợp lệ (vd: 1.2.3)");
      if (payload.minimum_os_version && !validators.minOS(payload.minimum_os_version)) throw new Error("minimum_os_version không hợp lệ");

      if (editingId) {
        await supabase.from("apps").update(payload).eq("id", editingId);
      } else {
        await supabase.from("apps").insert([{ ...payload, id: uuidv4(), created_at: new Date().toISOString() }]);
      }
      alert(editingId ? "Cập nhật thành công!" : "Thêm mới thành công!");
      resetForm(true);
      fetchApps();
    } catch (err) {
      setErrorMessage(err.message || "Lỗi khi lưu dữ liệu");
    } finally {
      setSubmitting(false);
    }
  }

  // Community actions
  async function hideComment(c) {
    try {
      await updateDoc(doc(db,"comments",c.id), { hidden:true });
    } catch { setErrorMessage("Không ẩn được bình luận"); }
  }
  async function deleteComment(c) {
    if (!confirm("Xoá bình luận vĩnh viễn?")) return;
    try {
      await deleteDoc(doc(db,"comments",c.id));
    } catch { setErrorMessage("Không xoá được bình luận"); }
  }

  // UI helpers
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
        input, select, textarea { font-size:16px; } /* chống zoom iOS */
        .table-wrap{ overflow-x:auto; }
        @media (max-width: 768px){
          .table-sm thead { display:none; }
          .table-sm tr { display:block; border:1px solid rgba(0,0,0,.06); border-radius:8px; margin-bottom:12px; }
          .table-sm td { display:flex; justify-content:space-between; padding:10px 12px; }
          .table-sm td::before { content: attr(data-label); font-weight:600; margin-right:12px; }
        }
      `}</style>

      <div className={`min-h-screen flex ${darkMode?"bg-gray-900 text-white":"bg-gray-100 text-gray-800"}`}>
        {/* Sidebar: luôn hiển thị (cả mobile) */}
        <aside className="w-64 flex flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Admin Panel</h2>
            <button onClick={()=>setDarkMode(!darkMode)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700">
              <FontAwesomeIcon icon={darkMode?faSun:faMoon}/>
            </button>
          </div>
          <nav className="p-3 space-y-2">
            <button onClick={()=>goTab("apps")}
              className={`w-full text-left px-4 py-2 rounded ${activeTab==="apps"?"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200":"hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              <FontAwesomeIcon icon={faBoxOpen} className="mr-2"/> Ứng dụng
            </button>
            <button onClick={()=>goTab("categories")}
              className={`w-full text-left px-4 py-2 rounded ${activeTab==="categories"?"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200":"hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              <FontAwesomeIcon icon={faFolder} className="mr-2"/> Chuyên mục
            </button>
            <button onClick={()=>goTab("community")}
              className={`w-full text-left px-4 py-2 rounded ${activeTab==="community"?"bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200":"hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
              <FontAwesomeIcon icon={faShieldAlt} className="mr-2"/> Cộng đồng
            </button>
          </nav>
          <div className="mt-auto p-4 border-t border-gray-200 dark:border-gray-700 flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center font-bold">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="ml-2 truncate">{user?.email}</span>
            <button onClick={async()=>{ await supabase.auth.signOut(); router.push("/login"); }}
              className="ml-auto text-red-500 hover:text-red-600" title="Đăng xuất">
              <FontAwesomeIcon icon={faSignOutAlt}/>
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 overflow-auto pb-24">
          {/* Mobile header (có nút tab nhanh) */}
          <div className="md:hidden mb-3 flex gap-2">
            {["apps","categories","community"].map(t=>(
              <button key={t} onClick={()=>goTab(t)}
                className={`px-3 py-2 rounded text-sm ${activeTab===t?"bg-blue-600 text-white":"bg-gray-200 dark:bg-gray-700"}`}>
                {t==="apps"?"Ứng dụng":t==="categories"?"Chuyên mục":"Cộng đồng"}
              </button>
            ))}
            <button onClick={()=>setDarkMode(!darkMode)}
              className="ml-auto px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">
              <FontAwesomeIcon icon={darkMode?faSun:faMoon}/>
            </button>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900 dark:text-red-100 rounded-r-md flex justify-between">
              <span><FontAwesomeIcon icon={faExclamationTriangle} className="mr-2"/>{errorMessage}</span>
              <button onClick={()=>setErrorMessage("")}><FontAwesomeIcon icon={faTimes}/></button>
            </div>
          )}

          {/* ===== Apps ===== */}
          {activeTab==="apps" && (
            <>
              {/* Form */}
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md mb-6">
                <h2 className="text-lg md:text-xl font-semibold mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={editingId?faEdit:faPlus}/>
                  {editingId ? "Sửa ứng dụng" : "Thêm ứng dụng mới"}
                </h2>
                {!HAS_TOOLS && (
                  <div className="mb-3 text-xs text-gray-600 dark:text-gray-300">
                    * Đã tắt nút "Get Info App Store" & "Tính size IPA" vì bạn chưa cần API phụ.
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Chuyên mục:</label>
                    <select value={selectedCategory}
                      onChange={(e)=>{ const v=e.target.value; setSelectedCategory(v); setEditingId(null); setForm({category_id:v, published:true}); setScreenshotInput(""); setScreenshots([]); setErrorMessage(""); }}
                      className={inputBase} required>
                      <option value="">-- Chọn chuyên mục --</option>
                      {categories.map((c)=><option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  {/* App Store autofill (ẩn nếu HAS_TOOLS=false) */}
                  {HAS_TOOLS && selectedCategory && (currentCategory?.enable_appstore_fetch) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex gap-2">
                        <input type="url" value={appStoreUrl} onChange={(e)=>setAppStoreUrl(e.target.value)}
                               placeholder="Nhập URL App Store..." className={`${inputBase} flex-1`}/>
                        <button type="button" disabled={loadingAppStoreInfo}
                                onClick={async()=>{
                                  try{
                                    setLoadingAppStoreInfo(true);
                                    const res = await fetch("/api/admin/appstore-info", {
                                      method:"POST",
                                      headers:{ "Content-Type":"application/json", "x-csrf":"1" },
                                      body: JSON.stringify({ url: appStoreUrl.trim() })
                                    });
                                    const data = await res.json();
                                    if(!res.ok) throw new Error(data?.error || "Lỗi server");
                                    const mapped = {
                                      name: data.name||"", author: data.author||"", size: data.size||"",
                                      description: data.description||"", version: data.version||"",
                                      icon_url: data.icon||"", minimum_os_version: data.minimumOsVersion||"",
                                      age_rating: data.ageRating||"", release_date: data.releaseDate? new Date(data.releaseDate).toISOString().split("T")[0] : "",
                                      supported_devices: Array.isArray(data.supportedDevices)? data.supportedDevices.join(", "):"",
                                      languages: Array.isArray(data.languages)? data.languages.join(", "):"",
                                    };
                                    setForm(prev=>({ ...prev, ...mapped }));
                                    const snaps = Array.isArray(data.screenshots)? data.screenshots : [];
                                    setScreenshots(snaps);
                                    setScreenshotInput(snaps.join("\n"));
                                    setAppStoreUrl("");
                                  }catch(e){ setErrorMessage(e.message); }
                                  finally{ setLoadingAppStoreInfo(false); }
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                          {loadingAppStoreInfo ? <><FontAwesomeIcon icon={faSpinner} spin/> Đang lấy...</> : "Get Info"}
                        </button>
                      </div>
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
                          onChange={(e)=>setForm(prev=>({...prev,[f.name]:e.target.value}))}
                          className={inputBase}/>
                      )}
                      {f.type==="number" && (
                        <input type="number" value={form[f.name]||""}
                          onChange={(e)=>setForm(prev=>({...prev,[f.name]:e.target.value}))}
                          className={inputBase}/>
                      )}
                      {f.type==="url" && (
                        <input type="url" value={form[f.name]||""}
                          onChange={(e)=>setForm(prev=>({...prev,[f.name]:e.target.value}))}
                          className={inputBase} placeholder="https://..."/>
                      )}
                      {f.type==="date" && (
                        <input type="date" value={form[f.name]||""}
                          onChange={(e)=>setForm(prev=>({...prev,[f.name]:e.target.value}))}
                          className={inputBase}/>
                      )}
                      {f.type==="array" && (
                        <textarea rows={3}
                          value={Array.isArray(form[f.name])? form[f.name].join(", ") : (form[f.name]||"")}
                          onChange={(e)=>setForm(prev=>({...prev,[f.name]:e.target.value}))}
                          className={inputBase} placeholder="Giá trị, cách nhau bởi dấu phẩy"/>
                      )}
                    </div>
                  ))}

                  {/* Built-in extras */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug (auto):</label>
                      <input type="text" value={form.slug||""}
                        onChange={(e)=>setForm(prev=>({...prev, slug:e.target.value}))}
                        className={inputBase}/>
                    </div>
                    <label className="flex items-center gap-2 mt-6 md:mt-0">
                      <input type="checkbox" checked={!!form.published}
                        onChange={(e)=>setForm(prev=>({...prev,published:e.target.checked}))}/>
                      <span className="text-sm">Hiển thị (published)</span>
                    </label>
                  </div>

                  {/* Screenshots */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Screenshots (mỗi URL 1 dòng):</label>
                    <textarea rows={4} value={screenshotInput}
                      onChange={(e)=>{ setScreenshotInput(e.target.value); setScreenshots(e.target.value.split(/[\n,]+/).map(s=>s.trim()).filter(Boolean)); }}
                      className={inputBase}/>
                    {screenshots.length>0 && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
                        {screenshots.map((u,i)=>(
                          <div key={i} className="relative group">
                            <img src={u} alt="" className="w-full h-28 object-cover rounded"/>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition"/>
                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button type="button" title="Lên"
                                onClick={()=>{ if(i>0){ const arr=[...screenshots]; [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; setScreenshots(arr); setScreenshotInput(arr.join("\n")); } }}
                                className="px-2 py-1 bg-white/90 rounded text-xs">↑</button>
                              <button type="button" title="Xuống"
                                onClick={()=>{ if(i<screenshots.length-1){ const arr=[...screenshots]; [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; setScreenshots(arr); setScreenshotInput(arr.join("\n")); } }}
                                className="px-2 py-1 bg-white/90 rounded text-xs">↓</button>
                              <button type="button" title="Xoá"
                                onClick={()=>{ const arr=screenshots.filter((_,idx)=>idx!==i); setScreenshots(arr); setScreenshotInput(arr.join("\n")); }}
                                className="px-2 py-1 bg-red-600 text-white rounded text-xs"><FontAwesomeIcon icon={faTrash}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Tool row */}
                  {HAS_TOOLS && (
                    <div>
                      <button type="button" onClick={async()=>{
                        try{
                          const plistName = (form["download_link"]||"").trim();
                          if(!plistName) return setErrorMessage("Chưa có download_link (tên plist/ipa)");
                          const tokenRes = await fetch(`/api/generate-token`, { method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify({ ipa_name: plistName }) });
                          const { token } = await tokenRes.json(); if(!token) throw new Error("Không nhận được token");
                          const plistUrl = `/api/plist?ipa_name=${encodeURIComponent(plistName)}&token=${token}`;
                          const plistResp = await fetch(plistUrl); const plistText = await plistResp.text();
                          const m = plistText.match(/<key>url<\/key>\s*<string>([^<]+\.ipa)<\/string>/i);
                          if(!m) throw new Error("Không tìm thấy URL IPA trong plist");
                          const sizeRes = await fetch(`/api/admin/get-size-ipa?url=${encodeURIComponent(m[1])}`);
                          const { size, error } = await sizeRes.json(); if(error || !size) throw new Error(error || "Không nhận được size");
                          setForm(prev=>({ ...prev, size: `${(size/(1024*1024)).toFixed(2)} MB` }));
                          alert("Đã tính kích thước IPA");
                        }catch(e){ setErrorMessage(e.message); setForm(prev=>({ ...prev, size:`Lỗi: ${e.message}` })); }
                      }} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                        Tính size IPA
                      </button>
                    </div>
                  )}

                  {/* Submit */}
                  <div className="flex gap-4 pt-2">
                    <button type="submit" disabled={submitting || !selectedCategory}
                      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center gap-2">
                      {submitting ? (<><FontAwesomeIcon icon={faSpinner} spin/> Đang lưu...</>) :
                        (editingId ? (<><FontAwesomeIcon icon={faSave}/> Cập nhật</>) : (<><FontAwesomeIcon icon={faPlus}/> Thêm mới</>))}
                    </button>
                    {editingId && (
                      <button type="button" onClick={()=>resetForm(true)} className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* List */}
              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                  <h2 className="text-lg md:text-xl font-semibold">Danh sách ứng dụng</h2>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64 max-w-[70vw]">
                      <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                      <input type="text" placeholder="Tìm kiếm..." value={search}
                             onChange={(e)=>{ setSearch(e.target.value); setPage(1); }}
                             className={`${inputBase} pl-10`}/>
                    </div>
                    <select value={sortBy} onChange={(e)=>{ setSortBy(e.target.value); setPage(1); }} className={inputBase}>
                      <option value="created_at">Mới nhất</option>
                      <option value="name">Tên (A→Z)</option>
                    </select>
                    <button onClick={()=>setSortAsc(!sortAsc)} className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">
                      {sortAsc ? "↑" : "↓"}
                    </button>
                  </div>
                </div>

                <div className="table-wrap">
                  <table className="w-full border-collapse table-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-medium">Tên</th>
                        <th className="text-left p-3 font-medium">Chuyên mục</th>
                        <th className="text-left p-3 font-medium">Ngày tạo</th>
                        <th className="text-left p-3 font-medium">Trạng thái</th>
                        <th className="text-left p-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apps.map((app)=>(
                        <tr key={app.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3" data-label="Tên">
                            <div className="flex items-center gap-3">
                              {app.icon_url && <img src={app.icon_url} alt="" className="w-8 h-8 rounded" />}
                              <div className="font-medium">{app.name || "Không có tên"}</div>
                            </div>
                          </td>
                          <td className="p-3" data-label="Chuyên mục">
                            {categories.find(c=>c.id===app.category_id)?.name || "N/A"}
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
                              <button onClick={()=>startEdit(app)} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                                <FontAwesomeIcon icon={faEdit}/> Sửa
                              </button>
                              <button onClick={()=>duplicateApp(app)} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700">
                                <FontAwesomeIcon icon={faCopy}/> Nhân bản
                              </button>
                              <button onClick={()=>handleDelete(app.id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
                                <FontAwesomeIcon icon={faTrash}/> Xoá
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {apps.length===0 && (
                        <tr><td colSpan={5} className="py-10 text-center text-gray-500">
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
                  <FontAwesomeIcon icon={editingCategoryId?faEdit:faPlus}/>
                  {editingCategoryId ? "Sửa chuyên mục" : "Thêm chuyên mục mới"}
                </h2>
                <form onSubmit={async(e)=>{
                  e.preventDefault();
                  try{
                    const payload = {
                      name: categoryForm.name.trim(),
                      slug: (categoryForm.slug||"").trim() || createSlug(categoryForm.name),
                      enable_appstore_fetch: !!categoryForm.enable_appstore_fetch,
                      fields: categoryForm.fields || [],
                    };
                    if(!payload.name) throw new Error("Tên chuyên mục bắt buộc");
                    const { data: s } = await supabase.from("categories").select("id").eq("slug", payload.slug).neq("id", editingCategoryId||"");
                    if (s && s.length>0) throw new Error("Slug chuyên mục đã tồn tại");

                    if (editingCategoryId) await supabase.from("categories").update(payload).eq("id", editingCategoryId);
                    else await supabase.from("categories").insert([{ ...payload, id: uuidv4() }]);

                    setCategoryForm({ name:"", slug:"", enable_appstore_fetch:false, fields:[] });
                    setEditingCategoryId(null);
                    fetchCategories();
                  }catch(err){ setErrorMessage(err.message||"Lỗi khi lưu chuyên mục"); }
                }} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Tên chuyên mục:</label>
                      <input type="text" value={categoryForm.name}
                             onChange={(e)=>setCategoryForm(prev=>({...prev, name:e.target.value}))}
                             className={inputBase} required/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Slug (tùy chọn):</label>
                      <input type="text" value={categoryForm.slug}
                             onChange={(e)=>setCategoryForm(prev=>({...prev, slug:e.target.value}))}
                             className={inputBase}/>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input id="enable_appstore_fetch" type="checkbox"
                           checked={!!categoryForm.enable_appstore_fetch}
                           onChange={(e)=>setCategoryForm(prev=>({...prev, enable_appstore_fetch:e.target.checked}))}
                           className="h-4 w-4"/>
                    <label htmlFor="enable_appstore_fetch" className="text-sm">Bật tự động lấy thông tin từ App Store</label>
                  </div>

                  <div className="p-3 rounded border border-gray-200 dark:border-gray-700">
                    <div className="font-semibold mb-2">Trường dữ liệu</div>
                    <div className="grid md:grid-cols-4 gap-2">
                      <input type="text" value={newFieldName} onChange={(e)=>setNewFieldName(e.target.value)}
                             placeholder="name / author / icon_url ..." className={inputBase}/>
                      <select value={newFieldType} onChange={(e)=>setNewFieldType(e.target.value)} className={inputBase}>
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
                             placeholder="Mô tả (tùy chọn)" className={inputBase}/>
                    </div>
                    <div className="mt-2">
                      <button type="button" onClick={()=>{
                        const name=newFieldName.trim(); if(!name) return;
                        if(!/^[a-z0-9_]+$/i.test(name)) return setErrorMessage("Tên field chỉ gồm chữ/số/_");
                        setCategoryForm(prev=>({...prev, fields:[...(prev.fields||[]), { name, type:newFieldType, required:!!newFieldRequired, desc:newFieldDesc.trim() }]}));
                        setNewFieldName(""); setNewFieldType("text"); setNewFieldRequired(false); setNewFieldDesc("");
                      }} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        <FontAwesomeIcon icon={faPlus}/> Thêm field
                      </button>
                    </div>

                    <div className="mt-3 space-y-2">
                      {(categoryForm.fields||[]).map((f,i)=>(
                        <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{f.name}</div>
                            <div className="text-xs text-gray-500">{f.type}{f.required?" • bắt buộc":""}{f.desc?` • ${f.desc}`:""}</div>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" title="Lên" onClick={()=>{
                              const arr=[...categoryForm.fields]; if(i>0){ [arr[i-1],arr[i]]=[arr[i],arr[i-1]]; setCategoryForm(prev=>({...prev, fields:arr})); }
                            }} className="px-2 py-1 bg-white dark:bg-gray-600 rounded border text-xs">↑</button>
                            <button type="button" title="Xuống" onClick={()=>{
                              const arr=[...categoryForm.fields]; if(i<arr.length-1){ [arr[i+1],arr[i]]=[arr[i],arr[i+1]]; setCategoryForm(prev=>({...prev, fields:arr})); }
                            }} className="px-2 py-1 bg-white dark:bg-gray-600 rounded border text-xs">↓</button>
                            <button type="button" onClick={()=>{
                              setCategoryForm(prev=>({...prev, fields: prev.fields.filter((_,idx)=>idx!==i)}));
                            }} className="px-2 py-1 bg-red-600 text-white rounded text-xs"><FontAwesomeIcon icon={faTimes}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      {editingCategoryId ? <><FontAwesomeIcon icon={faSave}/> Cập nhật</> : <><FontAwesomeIcon icon={faPlus}/> Thêm mới</>}
                    </button>
                    {editingCategoryId && (
                      <button type="button" onClick={()=>{ setEditingCategoryId(null); setCategoryForm({ name:"", slug:"", enable_appstore_fetch:false, fields:[] }); }}
                              className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
                        Hủy
                      </button>
                    )}
                  </div>
                </form>
              </section>

              <section className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-lg shadow-md">
                <h2 className="text-lg md:text-xl font-semibold mb-4">Danh sách chuyên mục</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left p-3 font-medium">Tên</th>
                        <th className="text-left p-3 font-medium">Slug</th>
                        <th className="text-left p-3 font-medium">AppStore</th>
                        <th className="text-left p-3 font-medium">Số field</th>
                        <th className="text-left p-3 font-medium">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((cat)=>(
                        <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="p-3 font-medium">{cat.name}</td>
                          <td className="p-3">{cat.slug || "-"}</td>
                          <td className="p-3">{cat.enable_appstore_fetch?"Bật":"Tắt"}</td>
                          <td className="p-3">{cat.fields?.length || 0}</td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button onClick={()=>{
                                setEditingCategoryId(cat.id);
                                setCategoryForm({
                                  name: cat.name, slug: cat.slug||"", enable_appstore_fetch: !!cat.enable_appstore_fetch,
                                  fields: Array.isArray(cat.fields)? [...cat.fields]:[]
                                });
                                goTab("categories");
                                window.scrollTo({ top: 0, behavior: "smooth" });
                              }} className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                                <FontAwesomeIcon icon={faEdit}/> Sửa
                              </button>
                              <button onClick={async()=>{
                                if(!confirm("Xoá chuyên mục sẽ ẩn (soft-delete) toàn bộ app của nó. Xác nhận?")) return;
                                try{
                                  await supabase.from("apps").update({ deleted_at: new Date().toISOString() }).eq("category_id", cat.id);
                                  await supabase.from("categories").delete().eq("id", cat.id);
                                  await Promise.all([fetchCategories(), fetchApps()]);
                                }catch{ setErrorMessage("Lỗi khi xoá chuyên mục"); }
                              }} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
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

          {/* ===== Community ===== */}
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
                        ) : <span className="px-3 py-1 text-xs bg-gray-300 dark:bg-gray-600 rounded">Đã ẩn</span>}
                        <button onClick={()=>deleteComment(c)} className="px-3 py-1 text-xs bg-red-600 text-white rounded"><FontAwesomeIcon icon={faTrash}/> Xoá</button>
                      </div>
                    </div>
                  ))}
                  {comments.length===0 && <div className="text-gray-500">Không có bình luận</div>}
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
                <h3 className="font-semibold mb-3">Bảng điều khiển nhanh</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Tổng số ứng dụng</div>
                    <div className="text-xl font-bold">{totalApps || 0}</div>
                  </div>
                  <div className="p-3 rounded bg-gray-50 dark:bg-gray-700">
                    <div className="text-xs text-gray-500 mb-1">Chuyên mục</div>
                    <div className="text-xl font-bold">{categories.length}</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}