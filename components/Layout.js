// components/Layout.js
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Layout({ children, title = 'TestFlight Share' }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-md">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link href="/">
              <a className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                🚀 TestFlight Share
              </a>
            </Link>

            <nav className="flex items-center gap-4">
              <Link href="/">
                <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Trang chính</a>
              </Link>
              <Link href="/admin">
                <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Admin</a>
              </Link>
              <button
                onClick={() => setDarkMode(!darkMode)}
                title="Chuyển giao diện"
                className="ml-2 p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {darkMode ? '☀️' : '🌙'}
              </button>
            </nav>
          </div>
        </header>

        {/* Main */}
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-6 mt-12">
          <div className="container mx-auto px-4 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} TestFlight Share. Built with ❤️ by bạn.
          </div>
        </footer>
      </div>
    </>
  );
}