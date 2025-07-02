// components/Layout.js
import Head from 'next/head';

export default function Layout({ children }) {
  return (
    <>
      <Head>
        <title>TestFlight Share - Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div className="layout">
        <header>
          <h1>🚀 TestFlight Share</h1>
          <nav>
            <a href="/">Trang chính</a>
            <a href="/admin">Admin</a>
          </nav>
        </header>
        <main>{children}</main>
      </div>
    </>
  );
}