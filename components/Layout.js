import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, faMoon, faSun, 
  faTools, faThList, faInfoCircle, 
  faTimes, faSearch 
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ 
  children, 
  fullWidth = false,
  categories = [] // Nhận categories từ trang cha (nếu cần)
}) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Xử lý dark mode đồng bộ
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    document.documentElement.classList.toggle('dark', newMode);
    localStorage.setItem('darkMode', newMode);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
      <Head>
        <title>StreiOS - Chia sẻ ứng dụng testflight beta và tool jailbreak cho iOS</title>
        <meta name="description" content="Nền tảng chia sẻ ứng dụng TestFlight beta và công cụ jailbreak cho iOS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Left Navigation (Desktop) */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/tools">
              <a className="hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
                <FontAwesomeIcon icon={faTools} className="w-4 h-4" />
                <span>Công cụ</span>
              </a>
            </Link>
            <Link href="/categories">
              <a className="hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
                <FontAwesomeIcon icon={faThList} className="w-4 h-4" />
                <span>Chuyên mục</span>
              </a>
            </Link>
            <Link href="/about">
              <a className="hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-2 text-sm font-medium">
                <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4" />
                <span>Giới thiệu</span>
              </a>
            </Link>
          </nav>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open menu"
          >
            <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
          </button>

          {/* Logo */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <Link href="/">
              <a className="text-3xl font-bold group">
                <span className="bg-gradient-to-r from-black via-red-900 to-red-600 bg-clip-text text-transparent 
                              bg-[length:200%_auto] bg-left group-hover:bg-right transition-all duration-1000 
                              drop-shadow-[0_0_10px_rgba(153,27,27,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]">
                  ꗟ𝕥𝕣ⅇ𝕚⌾𝕊
                </span>
              </a>
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Search"
            >
              <FontAwesomeIcon icon={faSearch} className="w-5 h-5" />
            </button>
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute top-0 left-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl transition-transform duration-300">
            <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
              <span className="font-bold text-xl">Menu</span>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <Link href="/tools">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <FontAwesomeIcon icon={faTools} className="w-5 h-5 mr-3" />
                    Công cụ
                  </a>
                </Link>
                <Link href="/categories">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <FontAwesomeIcon icon={faThList} className="w-5 h-5 mr-3" />
                    Chuyên mục
                  </a>
                </Link>
                <Link href="/about">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    <FontAwesomeIcon icon={faInfoCircle} className="w-5 h-5 mr-3" />
                    Giới thiệu
                  </a>
                </Link>
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-medium transition-colors"
              >
                <FontAwesomeIcon icon={faSearch} />
                Tìm kiếm ứng dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Tìm kiếm ứng dụng</h2>
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Close search"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
              
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Nhập tên ứng dụng..."
                  className="w-full px-4 py-3 pl-12 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" 
                />
              </div>
              
              {/* Categories Grid - Chỉ hiển thị nếu có categories từ props */}
              {categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category.name}</span>
                        <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {category.apps?.count || 0} apps
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`${fullWidth ? 'w-full' : 'w-full max-w-screen-2xl mx-auto px-4'} py-6 flex-1`}>
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/">
              <a className="text-2xl font-bold bg-gradient-to-r from-black via-red-900 to-red-600 bg-clip-text text-transparent">
                ꗟ𝕥𝕣ⅇ𝕚⌾𝕊
              </a>
            </Link>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Nền tảng chia sẻ ứng dụng TestFlight beta và công cụ jailbreak cho iOS.
            </p>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle dark mode"
              >
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Liên kết</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/tools">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Công cụ
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/categories">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Chuyên mục
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/about">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Giới thiệu
                  </a>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Categories Section - Chỉ hiển thị nếu có categories từ props */}
          {categories.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Chuyên mục</h3>
              <ul className="space-y-2">
                {categories.slice(0, 5).map((category) => (
                  <li key={category.id}>
                    <Link href={`/category/${category.id}`}>
                      <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        {category.name} ({category.apps?.count || 0})
                      </a>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Hỗ trợ</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/contact">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Liên hệ
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Điều khoản
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                    Chính sách bảo mật
                  </a>
                </Link>
              </li>
            </ul>
            <button
              onClick={() => window.open('https://www.buymeacoffee.com', '_blank')}
              className="mt-4 flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              ☕ Ủng hộ chúng tôi
            </button>
          </div>
        </div>
        
        <div className="border-t border-gray-200 dark:border-gray-700 py-6">
          <div className="w-full max-w-screen-2xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>© {new Date().getFullYear()} StreiOS. All rights reserved.</div>
            <div className="mt-2 md:mt-0">
              Made with ❤️ for iOS community
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}