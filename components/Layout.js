import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link href="/">
              <a className="text-2xl font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                🚀 TestFlight Share
              </a>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/">
                <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Trang chính</a>
              </Link>
              <Link href="/admin">
                <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Admin</a>
              </Link>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Tìm kiếm..."
                  className="px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 text-sm"
                />
              </div>
              <button
                onClick={() => setDarkMode(!darkMode)}
                title="Chuyển giao diện"
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {darkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>
            </nav>

            {/* Mobile Menu Button */}
            <div className="flex md:hidden items-center gap-3">
              <button
                onClick={() => setDarkMode(!darkMode)}
                title="Chuyển giao diện"
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                {darkMode ? (
                  <SunIcon className="w-5 h-5" />
                ) : (
                  <MoonIcon className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-600 dark:text-gray-300 focus:outline-none"
              >
                {mobileMenuOpen ? <CloseIcon /> : <HamburgerIcon />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-gray-200 dark:border-gray-700">
              <nav className="flex flex-col space-y-3 pt-2">
                <Link href="/">
                  <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Trang chính</a>
                </Link>
                <Link href="/admin">
                  <a className="text-sm font-medium hover:text-blue-600 dark:hover:text-blue-300 transition">Admin</a>
                </Link>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Tìm kiếm..."
                    className="w-full px-4 py-1.5 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 text-sm"
                  />
                </div>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Welcome to TestFlight Share</h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
            Đây là một layout hiện đại, đáp ứng đầy đủ nhu cầu người dùng với header có menu hamburger, tìm kiếm và footer đầy đủ.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 py-10 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Về chúng tôi</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Giới thiệu</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Liên hệ</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Tin tức</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Cơ hội việc làm</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Hỗ trợ</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">FAQs</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Hướng dẫn</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Chính sách bảo mật</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Điều khoản dịch vụ</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Sản phẩm</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">TestFlight Tools</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">iOS Beta Testing</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Android Alpha Sharing</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Cloud Hosting</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Mạng xã hội</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Facebook</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">Twitter</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-blue-600 dark:hover:text-blue-300 transition">GitHub</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} TestFlight Share. Built with ❤️ by bạn.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Icons
function HamburgerIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path>
    </svg>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
    </svg>
  );
}