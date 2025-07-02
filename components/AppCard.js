// components/AppCard.js
import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <Link href={`/${app.slug}`}>
      <div className="app-card">
        <img
          src={app.icon_url || '/default-icon.png'}
          alt={app.name}
          className="app-icon"
        />
        <div className="app-info">
          <h3>{app.name}</h3>
          {app.description && (
            <p>{app.description.slice(0, 80)}...</p>
          )}
          {app.testflight_url && (
            <a
              href={app.testflight_url}
              target="_blank"
              rel="noopener noreferrer"
              className="testflight-link"
            >
              Tham gia TestFlight
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}