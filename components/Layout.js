export default function Layout({ children }) {
  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20 }}>
      <header>
        <h1 style={{ textAlign: 'center' }}>TestFlight Share</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}