import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <Link href={`/${app.id}`}>
      <div style={{
        display: 'flex',
        margin: 10,
        padding: 10,
        border: '1px solid #ddd',
        borderRadius: 8,
        textDecoration: 'none',
        color: 'inherit',
        cursor: 'pointer'
      }}>
        {app.icon_url ? (
          <img src={app.icon_url} width={64} height={64} alt="icon" />
        ) : (
          <div style={{
            width: 64, height: 64,
            background: '#ccc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            color: '#666'
          }}>No Icon</div>
        )}

        <div style={{ marginLeft: 12 }}>
          <h3>
            {app.name || 'App chưa có tên'}
            {app.version && <small> v{app.version}</small>}
          </h3>
          {app.description ? (
            <p>{app.description.slice(0, 100)}...</p>
          ) : (
            <p><i>Không có mô tả</i></p>
          )}
        </div>
      </div>
    </Link>
  );
}