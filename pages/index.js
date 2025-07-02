// pages/index.js
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import { useState } from 'react';

export default function Home({ initialApps }) {
  const [apps, setApps] = useState(initialApps);
  const [q, setQ] = useState('');

  async function handleSearch(e) {
    e.preventDefault();
    const { data } = await supabase
      .from('apps')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('created_at', { ascending: false });

    setApps(data);
  }

  return (
    <Layout>
      <form onSubmit={handleSearch}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm kiếm app..."
        />
        <button type="submit">Tìm</button>
      </form>

      <div className="app-list">
        {apps.length > 0 ? (
          apps.map((app) => <AppCard key={app.id} app={app} />)
        ) : (
          <p>Không có ứng dụng nào.</p>
        )}
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
  const { data } = await supabase
    .from('apps')
    .select('*')
    .order('created_at', { ascending: false });

  return { props: { initialApps: data || [] } };
}