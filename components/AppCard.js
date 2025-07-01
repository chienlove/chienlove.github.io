import Link from 'next/link';
export default function AppCard({ app }) {
  return (
    <Link href={`/${app.id}`}>
      <a style={{ display:'flex', margin:10, padding:10, border:'1px solid #ddd', borderRadius:8 }}>
        <img src={app.icon_url} width={64} height={64} alt="icon"/>
        <div style={{ marginLeft:12 }}>
          <h3>{app.name} <small>v{app.version}</small></h3>
          <p>{app.description?.slice(0, 100)+"..."}</p>
        </div>
      </a>
    </Link>
  );
}