export default function Layout({ children }) {
  return (
    <div className="container">
      <header><h1>🚀 TestFlight Share</h1></header>
      <main>{children}</main>
    </div>
  );
}