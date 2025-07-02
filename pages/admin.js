// pages/admin.js
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

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('users') // Bảng custom `users` chứa role
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || data?.role !== 'admin') {
      router.push('/');
      return;
    }

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
  }

  async function handleDelete(id) {
    if (confirm('Bạn có chắc chắn muốn xoá?')) {
      await supabase.from('apps').delete().eq('id', id);
      fetchApps();
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const finalData = {
      ...form,
      category_id: selectedCategory,
    };

    if (editingId) {
      await supabase.from('apps').update(finalData).eq('id', editingId);
    } else {
      await supabase.from('apps').insert([finalData]);
    }

    setEditingId(null);
    setForm({});
    fetchApps();
  }

  async function handleCreateCategory() {
    const name = prompt('Tên chuyên mục?');
    const rawFields = prompt('Nhập các trường (cách nhau bằng dấu phẩy):\nVí dụ: name,author,icon_url');
    if (!name || !rawFields) return;
    const fields = rawFields.split(',').map((f) => f.trim());
    await supabase.from('categories').insert([{ name, fields }]);
    fetchCategories();
  }

  const currentFields = categories.find(c => c.id === selectedCategory)?.fields || [];

  if (loading) return <Layout><p>Đang kiểm tra quyền truy cập...</p></Layout>;

  return (
    <Layout>
      <h2>🎛 Admin Dashboard</h2>

      <button onClick={handleCreateCategory}>+ Tạo chuyên mục mới</button>

      <form onSubmit={handleSubmit} style={{ margin: '20px 0' }}>
        <label>Chuyên mục:</label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setForm({});
          }}
        >
          <option value="">-- chọn --</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
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
            />
          </div>
        ))}

        <button type="submit">
          {editingId ? 'Cập nhật' : 'Thêm ứng dụng'}
        </button>
      </form>

      <hr />
      <h3>📋 Danh sách ứng dụng</h3>
      {apps.map((app) => (
        <div key={app.id} style={{ marginBottom: 10 }}>
          <strong>{app.name}</strong> (ID: {app.id})
          <button onClick={() => handleEdit(app)} style={{ marginLeft: 10 }}>
            Sửa
          </button>
          <button onClick={() => handleDelete(app.id)} style={{ marginLeft: 5 }}>
            Xoá
          </button>
        </div>
      ))}
    </Layout>
  );
}