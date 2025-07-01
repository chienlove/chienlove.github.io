import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Admin() {
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({ /* same fields */ });

  useEffect(() => {
    fetchApps();
  }, []);

  async function fetchApps() {
    const { data } = await supabase.from('apps').select('*').order('created_at', { ascending:false });
    setApps(data);
  }

  async function handleSubmit(e) { /* insert form */}
  async function handleDelete(id) { /* delete */}
  async function handleEdit(app) { /* populate form */ }

  return (
    <Layout>
      <h2>Admin Dashboard</h2>
      <form onSubmit={handleSubmit}>
        {/* form inputs like before, include new fields: author, banner_url, version, size, category, device */}
        <button type="submit">Lưu</button>
      </form>
      <hr/>
      {apps.map(a => (
        <div key={a.id}>
          {a.name} v{a.version}
          <button onClick={()=>handleEdit(a)}>Sửa</button>
          <button onClick={()=>handleDelete(a.id)}>Xoá</button>
        </div>
      ))}
    </Layout>
  );
}