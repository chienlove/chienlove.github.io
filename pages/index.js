import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
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
      console.error('Lỗi tìm kiếm:', error.message);
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

      {apps.length > 0 ? (
        apps.map((app) => (
          <AppCard key={app.id} app={app} />
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
    console.error('❌ Supabase error:', error.message);
    return { props: { initialApps: [] } };
  }

  console.log('✅ Dữ liệu từ Supabase:', initialApps);

  return { props: { initialApps } };
}