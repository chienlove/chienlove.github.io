import { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, faMoon, faSun, 
  faTools, faThList, faInfoCircle, 
  faTimes, faSearch, faArrowLeft
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ 
  children, 
  fullWidth = false,
  categories = []
}) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Dark mode handler
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

  // Search function
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      <Head>
        <title>StreiOS - Ứng dụng TestFlight và Jailbreak iOS</title>
        <meta name="description" content="Nền tảng chia sẻ ứng dụng TestFlight beta và công cụ jailbreak cho iOS" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      {/* Header - Redesigned */}
      <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
            </button>

            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/">
                <a className="text-2xl font-bold">
                  <span className="bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    StreiOS
                  </span>
                </a>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex md:items-center md:space-x-8">
              <Link href="/tools">
                <a className="text-sm font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faTools} className="h-4 w-4" />
                  Công cụ
                </a>
              </Link>
              <Link href="/categories">
                <a className="text-sm font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faThList} className="h-4 w-4" />
                  Chuyên mục
                </a>
              </Link>
              <Link href="/about">
                <a className="text-sm font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faInfoCircle} className="h-4 w-4" />
                  Giới thiệu
                </a>
              </Link>
            </nav>

            {/* Search and Dark Mode */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 rounded-md text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                aria-label="Search"
              >
                <FontAwesomeIcon icon={faSearch} className="h-5 w-5" />
              </button>
              
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none"
                aria-label="Toggle dark mode"
              >
                <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="relative z-50 bg-white dark:bg-gray-800 shadow-xl w-full max-w-xs h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-700">
              <h2 className="text-xl font-bold">Menu</h2>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label="Close menu"
              >
                <FontAwesomeIcon icon={faTimes} className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <nav className="space-y-4">
                <Link href="/tools">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-3">
                    <FontAwesomeIcon icon={faTools} className="h-5 w-5" />
                    Công cụ
                  </a>
                </Link>
                <Link href="/categories">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-3">
                    <FontAwesomeIcon icon={faThList} className="h-5 w-5" />
                    Chuyên mục
                  </a>
                </Link>
                <Link href="/about">
                  <a className="block text-lg font-medium hover:text-red-600 dark:hover:text-red-400 transition-colors flex items-center gap-3">
                    <FontAwesomeIcon icon={faInfoCircle} className="h-5 w-5" />
                    Giới thiệu
                  </a>
                </Link>
              </nav>
              
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

      {/* Search Modal - Redesigned */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={clearSearch} />
          
          <div className="relative z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-2xl w-full mx-auto mt-20">
            <div className="p-4 border-b dark:border-gray-700">
              <div className="flex items-center">
                <button 
                  onClick={clearSearch}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 mr-2"
                  aria-label="Back"
                >
                  <FontAwesomeIcon icon={faArrowLeft} className="h-5 w-5" />
                </button>
                
                <form onSubmit={handleSearch} className="flex-1">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm ứng dụng..."
                      className="w-full pl-12 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      autoFocus
                    />
                    <FontAwesomeIcon 
                      icon={faSearch} 
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400" 
                    />
                  </div>
                </form>
              </div>
            </div>
            
            <div className="p-4 max-h-[70vh] overflow-y-auto">
              {/* Categories Section */}
              {categories.length > 0 && !searchQuery && (
                <div className="mb-6">
                  <h3 className="font-medium text-gray-500 dark:text-gray-400 mb-3">Tìm theo chuyên mục</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setSearchQuery(category.name);
                          handleSearch({ preventDefault: () => {} });
                        }}
                        className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {category.apps?.count || 0}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Search Results */}
              {isSearching ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
                </div>
              ) : searchResults.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-500 dark:text-gray-400">
                    Kết quả tìm kiếm ({searchResults.length})
                  </h3>
                  {searchResults.map((app) => (
                    <Link href={`/${app.slug}`} key={app.id}>
                      <a 
                        className="block p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        onClick={clearSearch}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700">
                            <img 
                              src={app.icon_url || '/placeholder-icon.png'} 
                              alt={app.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div>
                            <h4 className="font-medium">{app.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {app.description}
                            </p>
                          </div>
                        </div>
                      </a>
                    </Link>
                  ))}
                </div>
              ) : searchQuery && (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Không tìm thấy kết quả phù hợp
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={`${fullWidth ? 'w-full' : 'w-full max-w-screen-2xl mx-auto px-4 sm:px-6'} py-6 flex-1`}>
        {children}
      </main>

      {/* Footer - Redesigned */}
      <footer className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand Info */}
            <div className="space-y-4">
              <Link href="/">
                <a className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  StreiOS
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
                  <FontAwesomeIcon icon={darkMode ? faSun : faMoon} className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Liên kết nhanh</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/tools">
                    <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      Công cụ Jailbreak
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/categories">
                    <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      Danh mục ứng dụng
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/about">
                    <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      Về chúng tôi
                    </a>
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Categories */}
            {categories.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Chuyên mục</h3>
                <ul className="space-y-2">
                  {categories.slice(0, 5).map((category) => (
                    <li key={category.id}>
                      <Link href={`/category/${category.id}`}>
                        <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                          {category.name}
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Support */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-gray-800 dark:text-white">Hỗ trợ</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/contact">
                    <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      Liên hệ hỗ trợ
                    </a>
                  </Link>
                </li>
                <li>
                  <Link href="/terms">
                    <a className="text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors">
                      Điều khoản sử dụng
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
                className="mt-4 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
              >
                ☕ Ủng hộ chúng tôi
              </button>
            </div>
          </div>
          
          {/* Copyright */}
          <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <div>© {new Date().getFullYear()} StreiOS. All rights reserved.</div>
            <div className="mt-4 md:mt-0">
              Made with ❤️ for iOS community
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}