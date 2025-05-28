import { sql } from '@vercel/postgres';

export default function Home({ apps }) {
  return (
    <div>
      <h1>Danh sách ứng dụng TestFlight</h1>
      <div className="app-grid">
        {apps.map(app) => (
          <AppCard key={app.id} app={app} />
        ))}
      </div>
    </div>
  );
}

export async function getServerSideProps() {
  const { rows } = await sql`SELECT * FROM apps`;
  return { props: { apps: rows } };
}