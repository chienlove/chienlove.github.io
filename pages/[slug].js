import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';

export default function Detail({ app }) {
  if (!app) return <Layout><p>Không tìm thấy app.</p></Layout>;

  return (
    <Layout>
      <div className="app-detail">
        <h1>{app.name} <small>v{app.version}</small></h1>
        <p className="author">Tác giả: {app.author}</p>

        {app.banner_url && (
          <img src={app.banner_url} alt="banner" className="banner" />
        )}

        {app.description && <p className="desc">{app.description}</p>}

        <ul className="meta">
          {app.size && <li><strong>Dung lượng:</strong> {app.size} MB</li>}
          {app.category && <li><strong>Danh mục:</strong> {app.category}</li>}
          {app.device && <li><strong>Thiết bị:</strong> {app.device}</li>}
        </ul>

        {app.testflight_url && (
          <a href={app.testflight_url} target="_blank" className="btn">
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
      </div>
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