import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Detail({ app }) {
  if (!app) return <Layout><p>Không tìm thấy app.</p></Layout>;

  return (
    <Layout>
      <h1>{app.name} {app.version && <small>v{app.version}</small>}</h1>
      <p><em>Tác giả: {app.author || 'Không rõ'}</em></p>

      {app.banner_url && (
        <img src={app.banner_url} alt="banner" style={{ width: '100%', borderRadius: 8, marginTop: 10 }} />
      )}

      {app.description && <p style={{ marginTop: 12 }}>{app.description}</p>}

      <ul>
        {app.size && <li><strong>Kích thước:</strong> {app.size} MB</li>}
        {app.category && <li><strong>Danh mục:</strong> {app.category}</li>}
        {app.device && <li><strong>Thiết bị:</strong> {app.device}</li>}
      </ul>

      {app.testflight_url && (
        <a href={app.testflight_url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          margin: '20px 0',
          padding: '10px 15px',
          background: '#0070f3',
          color: '#fff',
          borderRadius: 5
        }}>
          Tham gia TestFlight
        </a>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data, error } = await supabase
    .from('apps')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    console.error('Lỗi truy vấn chi tiết app:', error.message);
  }

  return { props: { app: data || null } };
}