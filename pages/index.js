import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import { useState } from 'react';

export default function Home({ initialApps }) {
  const [apps, setApps] = useState(initialApps || []);
  const [q, setQ] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('apps')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('🔍 Lỗi tìm kiếm Supabase:', error.message);
      return;
    }

    setApps(data);
  };

  return (
    <Layout>
      <form onSubmit={handleSearch} style={{ marginBottom: 20 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm kiếm app..."
          style={{ padding: 8, width: '70%', marginRight: 10 }}
        />
        <button type="submit" style={{ padding: 8 }}>Tìm</button>
      </form>

      {/* ✅ Debug xem có dữ liệu không */}
      <pre style={{ background: '#f9f9f9', padding: 10 }}>
        {JSON.stringify(apps, null, 2)}
      </pre>

      {/* ✅ Hiển thị danh sách app cơ bản */}
      {apps.length > 0 ? (
        apps.map((app) => (
          <div key={app.id} style={{ padding: 10, border: '1px solid #ccc', marginBottom: 10 }}>
            <h3>{app.name || 'Không có tên app'}</h3>
            <p>Tác giả: {app.author || 'Không có'}</p>
            <p>Phiên bản: {app.version || 'N/A'}</p>
          </div>
        ))
      ) : (
        <p>Không có ứng dụng nào.</p>
      )}
    </Layout>
  );
}

export async function getServerSideProps() {
  const { data: initialApps, error } = await supabase
    .from('apps')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Supabase error trong getServerSideProps:', error.message);
    return { props: { initialApps: [] } };
  }

  console.log('✅ initialApps:', initialApps); // Log ra dữ liệu

  return { props: { initialApps } };
}