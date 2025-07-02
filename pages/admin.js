import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Admin() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || data?.role !== 'admin') return router.push('/');
    setUser(user);
    await fetchCategories();
    await fetchApps();
    setLoading(false);
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*');
    setCategories(data);
  }

  async function fetchApps() {
    const { data } = await supabase
      .from('apps')
      .select('*')
      .order('created_at', { ascending: false });
    setApps(data);
  }

  function handleEdit(app) {
    setEditingId(app.id);
    setSelectedCategory(app.category_id);
    setForm(app);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id) {
    if (confirm('Xác nhận xoá ứng dụng?')) {
      await supabase.from('apps').delete().eq('id', id);
      fetchApps();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...form,
      category_id: selectedCategory,
    };

    if (editingId) {
      await supabase.from('apps').update(payload).eq('id', editingId);
    } else {
      await supabase.from('apps').insert([payload]);
    }

    setForm({});
    setEditingId(null);
    setSubmitting(false);
    fetchApps();
  }

  async function handleCreateCategory() {
    const name = prompt('Tên chuyên mục mới?');
    const raw = prompt('Các trường cách nhau bởi dấu phẩy:\nVí dụ: name,author,icon_url');
    if (!name || !raw) return;
    const fields = raw.split(',').map(f => f.trim());
    await supabase.from('categories').insert([{ name, fields }]);
    fetchCategories();
  }

  const filteredApps = apps.filter(a =>
    a.name?.toLowerCase().includes(search.toLowerCase())
  );

  const currentFields = categories.find(c => c.id === selectedCategory)?.fields || [];

  if (loading) return (
    <Layout>
      <p>⏳ Đang tải dữ liệu quản trị...</p>
    </Layout>
  );

  return (
    <Layout>
      <div className="admin-header">
        <h2>🎛 Admin Panel</h2>
        <div>
          <span style={{ marginRight: 10 }}>👤 {user?.email}</span>
          <button onClick={handleLogout}>Đăng xuất</button>
        </div>
      </div>

      <button onClick={handleCreateCategory}>+ Tạo chuyên mục</button>

      <form onSubmit={handleSubmit} className="admin-form">
        <label>Chuyên mục:</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setForm({});
            setEditingId(null);
          }}
        >
          <option value="">-- chọn --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>

        {currentFields.map((field) => (
          <div key={field}>
            <label>{field}</label>
            <input
              type="text"
              value={form[field] || ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, [field]: e.target.value }))
              }
              placeholder={`Nhập ${field}`}
            />
          </div>
        ))}

        {/* Field: Screenshots */}
        <div>
          <label>Ảnh màn hình (dán link, cách nhau bằng dấu phẩy)</label>
          <input
            type="text"
            value={form.screenshots?.join(',') || ''}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                screenshots: e.target.value
                  .split(',')
                  .map((x) => x.trim())
                  .filter(Boolean),
              }))
            }
          />
        </div>

        {form.screenshots?.length > 0 && (
          <div className="screenshots-preview">
            {form.screenshots.map((url, i) => (
              <img key={i} src={url} />
            ))}
          </div>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm ứng dụng'}
        </button>
      </form>

      <hr />
      <h3>📋 Danh sách ứng dụng</h3>

      <input
        type="text"
        placeholder="🔍 Tìm theo tên..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: '100%', padding: 10, marginBottom: 20 }}
      />

      {filteredApps.map((a) => (
        <div key={a.id} className="app-item">
          <strong>{a.name}</strong>
          <small> • {a.version}</small>
          <button onClick={() => handleEdit(a)}>Sửa</button>
          <button onClick={() => handleDelete(a.id)}>Xoá</button>
        </div>
      ))}
    </Layout>
  );
}
