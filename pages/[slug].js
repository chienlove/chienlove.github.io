// pages/[slug].js
import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Detail({ app }) {
  if (!app) return <Layout><p>Không tìm thấy app.</p></Layout>;

  return (
    <Layout>
      <h1>{app.name} <small>v{app.version}</small></h1>
      <p><em>Tác giả: {app.author}</em></p>

      {app.banner_url && (
        <img src={app.banner_url} className="banner" />
      )}

      {app.description && <p>{app.description}</p>}

      <ul>
        {app.size && <li><strong>Dung lượng:</strong> {app.size} MB</li>}
        {app.device && <li><strong>Thiết bị:</strong> {app.device}</li>}
        {app.category && <li><strong>Chuyên mục:</strong> {app.category}</li>}
      </ul>

      {app.testflight_url && (
        <a href={app.testflight_url} className="btn" target="_blank" rel="noopener noreferrer">
          Tham gia TestFlight
        </a>
      )}

      {app.screenshots?.length > 0 && (
        <>
          <h3>Ảnh màn hình</h3>
          <div className="screenshots">
            {app.screenshots.map((url, i) => (
              <img key={i} src={url} alt={`screenshot-${i}`} />
            ))}
          </div>
        </>
      )}
    </Layout>
  );
}

export async function getServerSideProps({ params }) {
  const { data } = await supabase
    .from('apps')
    .select('*')
    .eq('slug', params.slug)
    .single();

  return { props: { app: data || null } };
}