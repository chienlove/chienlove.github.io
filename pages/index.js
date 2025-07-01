import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';
import { useState } from 'react';

export default function Home({ initialApps }) {
  const [apps, setApps] = useState(initialApps);
  const [q, setQ] = useState('');

  const handleSearch = async e => {
    e.preventDefault();
    const { data } = await supabase
      .from('apps')
      .select('*')
      .ilike('name', `%${q}%`)
      .order('created_at', { ascending: false });
    setApps(data);
  };

  return (
    <Layout>
      <form onSubmit={handleSearch}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm kiếm app..." />
        <button type="submit">Tìm</button>
      </form>
      {apps.map(app => <AppCard key={app.id} app={app} />)}
    </Layout>
  );
}

export async function getServerSideProps() {
  const { data: initialApps } = await supabase
    .from('apps')
    .select('*')
    .order('created_at', { ascending: false });
  return { props: { initialApps } };
}