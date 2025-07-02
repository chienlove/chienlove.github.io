export default function Layout({ children }) {
  return (
    <div style={{ maxWidth: 800, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <header style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1>🚀 TestFlight Share</h1>
      </header>
      <main>{children}</main>
    </div>
  );
}