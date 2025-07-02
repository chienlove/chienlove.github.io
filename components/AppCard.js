import Link from 'next/link';

export default function AppCard({ app }) {
  return (
    <Link href={`/${app.slug}`} className="card">
      <img src={app.icon_url || '/default-icon.png'} alt={app.name} />
      <div>
        <h3>{app.name}</h3>
        <p>{app.description?.slice(0, 80) || 'Không có mô tả'}...</p>
        {app.testflight_url && (
          <span className="link">TestFlight</span>
        )}
      </div>
    </Link>
  );
}