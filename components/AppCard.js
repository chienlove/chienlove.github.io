import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <Link href={`/${app.id}`} passHref>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        margin: '10px 0',
        padding: 12,
        border: '1px solid #ddd',
        borderRadius: 8,
        cursor: 'pointer',
        textDecoration: 'none',
        color: 'inherit'
      }}>
        <img
          src={app.icon_url || '/default-icon.png'}
          width={60}
          height={60}
          alt="icon"
          style={{ borderRadius: 12, objectFit: 'cover' }}
        />
        <div style={{ marginLeft: 12, flex: 1 }}>
          <h3 style={{ margin: 0 }}>
            {app.name}
            {app.version && <small style={{ marginLeft: 8, fontSize: 12, color: '#666' }}>v{app.version}</small>}
          </h3>
          {app.description ? (
            <p style={{ margin: '6px 0', color: '#444' }}>{app.description.slice(0, 80)}...</p>
          ) : (
            <p style={{ margin: '6px 0', color: '#999' }}><i>Không có mô tả</i></p>
          )}
          {app.testflight_url && (
            <a href={app.testflight_url} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 13,
              color: '#0070f3',
              textDecoration: 'underline'
            }}>
              Tham gia TestFlight
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}