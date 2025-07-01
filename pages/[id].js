import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Detail({ app }) {
  if (!app) return <Layout><p>Không tìm thấy app.</p></Layout>;

  return (
    <Layout>
      <h1>{app.name} <small>v{app.version}</small></h1>
      <p><em>Tác giả: {app.author}</em></p>
      <img src={app.banner_url} style={{ width:'100%', borderRadius:8 }} />
      <p>{app.description}</p>
      <ul>
        <li><strong>Kích thước:</strong> {app.size}</li>
        <li><strong>Danh mục:</strong> {app.category}</li>
        <li><strong>Thiết bị:</strong> {app.device}</li>
      </ul>
      <a href={app.testflight_url} style={{ display:'inline-block', margin:'20px 0', padding:'10px 15px', background:'#0070f3', color:'#fff', borderRadius:5 }}>
        Tham gia TestFlight
      </a>
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await supabase
    .from('apps')
    .select('*')
    .eq('id', params.id)
    .single();
  return { props: { app: data || null } };
}