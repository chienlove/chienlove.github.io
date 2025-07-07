import { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBars, faMoon, faSun, faTools, faThList, faInfoCircle, faTimes, 
  faSearch, faCode, faRocket, faDownload, faHeart, faGlobe,
  faChevronRight, faFilter, faStar, faClock, faFire, faSparkles,
  faBolt, faShieldAlt, faUsers, faGamepad, faDesktop, faCamera,
  faMobile, faCloud, faDatabase, faLayerGroup, faHashtag
} from '@fortawesome/free-solid-svg-icons';

export default function Layout({ children, fullWidth = false }) {
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState('');
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trendingApps, setTrendingApps] = useState([]);
  const [scrolled, setScrolled] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setDarkMode(saved === 'true');
    } else {
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Fetch categories with enhanced data
  useEffect(() => {
    async function fetchCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('*, apps:apps(count)')
        .order('name', { ascending: true });
      if (!error) setCategories(data || []);
    }
    fetchCategories();
  }, []);

  // Fetch trending apps
  useEffect(() => {
    async function fetchTrendingApps() {
      const { data, error } = await supabase
        .from('apps')
        .select('id, name, slug, icon, downloads, rating')
        .order('downloads', { ascending: false })
        .limit(5);
      if (!error) setTrendingApps(data || []);
    }
    fetchTrendingApps();
  }, []);

  // Enhanced search with debouncing
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      if (q.length > 0) {
        handleLiveSearch();
      } else {
        setSearchSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [q]);

  const handleLiveSearch = async () => {
    if (q.length < 2) return;
    
    const { data } = await supabase
      .from('apps')
      .select('id, name, slug, icon, category:categories(name)')
      .ilike('name', `%${q}%`)
      .limit(8);
    
    setSearchSuggestions(data || []);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    
    setSearching(true);
    
    // Save to recent searches
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const newRecent = [q, ...recent.filter(item => item !== q)].slice(0, 5);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));
    setRecentSearches(newRecent);
    
    let query = supabase
      .from('apps')
      .select('*, category:categories(name)')
      .order('downloads', { ascending: false });
    
    if (q) query = query.ilike('name', `%${q}%`);
    if (activeCategory !== 'all') query = query.eq('category_id', activeCategory);
    
    const { data } = await query;
    setApps(data || []);
    setSearching(false);
  };

  const handleAppClick = (slug) => {
    setApps([]);
    setQ('');
    setActiveCategory('all');
    setSearchSuggestions([]);
    setSearchOpen(false);
    router.push(`/${slug}`);
  };

  const clearSearch = () => {
    setQ('');
    setApps([]);
    setSearchSuggestions([]);
    setActiveCategory('all');
  };

  const getCategoryIcon = (categoryName) => {
    const iconMap = {
      'Jailbreak': faShieldAlt,
      'Games': faGamepad,
      'Productivity': faDesktop,
      'Photo': faCamera,
      'Social': faUsers,
      'Utilities': faTools,
      'Entertainment': faRocket,
      'Developer': faCode,
      'Cloud': faCloud,
      'Database': faDatabase
    };
    return iconMap[categoryName] || faLayerGroup;
  };

  // Load recent searches on mount
  useEffect(() => {
    const recent = JSON.parse(localStorage.getItem('recentSearches') || '[]');
    setRecentSearches(recent);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 transition-all duration-500">
      <Head>
        <title>StreiOS - Chia sẻ ứng dụng TestFlight beta và tool jailbreak cho iOS</title>
        <meta name="description" content="Nền tảng chia sẻ ứng dụng TestFlight beta và công cụ jailbreak cho iOS" />
        <meta name="theme-color" content={darkMode ? '#111827' : '#ffffff'} />
      </Head>

      {/* Enhanced Header */}
      <header className={`sticky top-0 z-50 w-full transition-all duration-500 ${
        scrolled 
          ? 'bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 shadow-lg shadow-gray-900/5' 
          : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/30 dark:border-gray-700/30'
      }`}>
        <div className="w-full max-w-screen-2xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Left Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            <Link href="/tools">
              <a className="group flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 font-medium">
                <div className="p-2 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <FontAwesomeIcon icon={faTools} className="w-4 h-4" />
                </div>
                <span>Công cụ</span>
              </a>
            </Link>
            <Link href="/categories">
              <a className="group flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 font-medium">
                <div className="p-2 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <FontAwesomeIcon icon={faThList} className="w-4 h-4" />
                </div>
                <span>Chuyên mục</span>
              </a>
            </Link>
            <Link href="/about">
              <a className="group flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 transition-all duration-300 font-medium">
                <div className="p-2 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                  <FontAwesomeIcon icon={faInfoCircle} className="w-4 h-4" />
                </div>
                <span>Giới thiệu</span>
              </a>
            </Link>
            </nav>

            {/* Mobile menu button */}
            <button
              className="lg:hidden p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>

            {/* Center Logo */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <Link href="/">
                <a className="group flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg shadow-red-500/25 group-hover:shadow-red-500/40 transition-all duration-300 group-hover:scale-105">
                      <FontAwesomeIcon icon={faRocket} className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-500 to-red-700 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity"></div>
                  </div>
                  <span className="text-2xl font-bold bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent group-hover:from-red-500 group-hover:via-red-600 group-hover:to-red-700 transition-all duration-300">
                    StreiOS
                  </span>
                </a>
              </Link>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSearchOpen(true)}
                className="group relative p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                aria-label="Search"
              >
                <FontAwesomeIcon icon={faSearch} className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="group relative p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300"
                aria-label="Toggle dark mode"
              >
                <FontAwesomeIcon 
                  icon={darkMode ? faSun : faMoon} 
                  className="w-5 h-5 group-hover:scale-110 transition-transform" 
                />
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl blur opacity-0 group-hover:opacity-20 transition-opacity"></div>
              </button>
            </div>
          </div>
        </header>

        {/* Enhanced Mobile Menu */}
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${
          mobileMenuOpen ? 'visible' : 'invisible'
        }`}>
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            mobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`} onClick={() => setMobileMenuOpen(false)} />
          
          <div className={`absolute top-0 left-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl transition-all duration-300 ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <FontAwesomeIcon icon={faRocket} className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">StreiOS</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                {[
                  { href: '/tools', icon: faTools, text: 'Công cụ' },
                  { href: '/categories', icon: faThList, text: 'Chuyên mục' },
                  { href: '/about', icon: faInfoCircle, text: 'Giới thiệu' }
                ].map((item, index) => (
                  <Link key={index} href={item.href}>
                    <a className="group flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                      <div className="p-2 rounded-lg group-hover:bg-red-50 dark:group-hover:bg-red-900/20 transition-colors">
                        <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                      </div>
                      <span className="font-medium">{item.text}</span>
                      <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 ml-auto opacity-50 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </Link>
                ))}
              </div>
              
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
                className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-4 rounded-xl font-medium transition-all duration-300 shadow-lg shadow-red-500/25"
              >
                <FontAwesomeIcon icon={faSearch} />
                Tìm kiếm ứng dụng
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Search Modal */}
        <div className={`fixed inset-0 z-50 transition-all duration-300 ${
          searchOpen ? 'visible' : 'invisible'
        }`}>
          <div className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
            searchOpen ? 'opacity-100' : 'opacity-0'
          }`} onClick={() => setSearchOpen(false)} />
          
          <div className={`absolute top-8 left-1/2 transform -translate-x-1/2 w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl transition-all duration-300 overflow-hidden ${
            searchOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}>
            {/* Search Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <FontAwesomeIcon icon={faSearch} className="w-6 h-6 text-red-600" />
                  Tìm kiếm ứng dụng
                </h2>
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                </button>
              </div>
              
              {/* Search Input */}
              <form onSubmit={handleSearch} className="relative">
                <div className={`relative transition-all duration-300 ${
                  searchFocused ? 'ring-2 ring-red-500 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : ''
                }`}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                    placeholder="Nhập tên ứng dụng, danh mục hoặc từ khóa..."
                    className="w-full px-6 py-4 pl-14 pr-14 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300 text-lg"
                    autoFocus
                  />
                  <FontAwesomeIcon 
                    icon={faSearch} 
                    className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" 
                  />
                  {q && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                      <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Search Content */}
            <div className="max-h-96 overflow-y-auto">
              {/* Search Suggestions */}
              {searchSuggestions.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faSparkles} className="w-4 h-4 text-yellow-500" />
                    Gợi ý tìm kiếm
                  </h3>
                  <div className="space-y-2">
                    {searchSuggestions.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.slug)}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <FontAwesomeIcon icon={faMobile} className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium group-hover:text-red-600 transition-colors">{app.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{app.category?.name}</div>
                        </div>
                        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              {!q && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faFilter} className="w-4 h-4 text-blue-500" />
                    Danh mục phổ biến
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categories.slice(0, 8).map((category) => (
                      <button
                        key={category.id}
                        onClick={() => {
                          setActiveCategory(category.id);
                          handleSearch({ preventDefault: () => {} });
                        }}
                        className={`group p-4 rounded-xl border transition-all duration-300 ${
                          activeCategory === category.id 
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20 shadow-lg shadow-red-500/10' 
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              activeCategory === category.id 
                                ? 'bg-red-100 dark:bg-red-900/40 text-red-600' 
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
                            } transition-colors`}>
                              <FontAwesomeIcon icon={getCategoryIcon(category.name)} className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                              {category.apps?.count || 0}
                            </span>
                            <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Searches */}
              {!q && recentSearches.length > 0 && (
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium mb-3 flex items-center gap-2">
                    <FontAwesomeIcon icon={faClock} className="w-4 h-4 text-gray-500" />
                    Tìm kiếm gần đây
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setQ(search);
                          searchInputRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                      >
                        <FontAwesomeIcon icon={faHashtag} className="w-3 h-3 text-gray-400" />
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Apps */}
              {!q && trendingApps.length > 0 && (
                <div className="p-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faFire} className="w-4 h-4 text-orange-500" />
                    Ứng dụng thịnh hành
                  </h3>
                  <div className="space-y-3">
                    {trendingApps.map((app, index) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.slug)}
                        className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-sm font-bold">
                            {index + 1}
                          </div>
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <FontAwesomeIcon icon={faMobile} className="w-6 h-6 text-white" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium group-hover:text-red-600 transition-colors">{app.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                              {app.downloads || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faStar} className="w-3 h-3 text-yellow-500" />
                              {app.rating || 0}
                            </span>
                          </div>
                        </div>
                        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              {searching && (
                <div className="p-6 text-center">
                  <div className="inline-flex items-center gap-3 text-gray-500">
                    <div className="w-5 h-5 border-2 border-red-500 border-t-transparent rounded-full animate-spin"></div>
                    Đang tìm kiếm...
                  </div>
                </div>
              )}
              
              {apps.length > 0 && (
                <div className="p-6">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <FontAwesomeIcon icon={faBolt} className="w-4 h-4 text-blue-500" />
                    Kết quả tìm kiếm ({apps.length})
                  </h3>
                  <div className="space-y-3">
                    {apps.map((app) => (
                      <div
                        key={app.id}
                        onClick={() => handleAppClick(app.slug)}
                        className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer transition-colors group border border-gray-200 dark:border-gray-700"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                          <FontAwesomeIcon icon={faMobile} className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-lg group-hover:text-red-600 transition-colors">{app.name}</div>
                          <div className="text-gray-500 dark:text-gray-400 mb-2">{app.description}</div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
                              <FontAwesomeIcon icon={faDownload} className="w-3 h-3" />
                              {app.downloads || 0} lượt tải
                            </span>
                            <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400">
                              <FontAwesomeIcon icon={faStar} className="w-3 h-3" />
                              {app.rating || 0}
                            </span>
                            <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                              <FontAwesomeIcon icon={faLayerGroup} className="w-3 h-3" />
                              {app.category?.name}
                            </span>
                          </div>
                        </div>
                        <FontAwesomeIcon icon={faChevronRight} className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className={`flex-1 ${fullWidth ? 'w-full' : 'max-w-screen-2xl mx-auto px-4'}`}>
          {children}
        </main>

        {/* Footer */}
        <footer className="bg-gray-800 dark:bg-gray-900 text-gray-200 py-12">
          <div className="max-w-screen-2xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                  <FontAwesomeIcon icon={faRocket} className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-xl">StreiOS</span>
              </div>
              <p className="text-sm text-gray-400">
                Nền tảng chia sẻ ứng dụng TestFlight beta và công cụ jailbreak cho iOS. Khám phá các ứng dụng độc đáo và công cụ mạnh mẽ để tối ưu hóa thiết bị của bạn.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Liên kết nhanh</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/tools">
                    <a className="hover:text-red-400 transition-colors">Công cụ</a>
                  </Link>
                </li>
                <li>
                  <Link href="/categories">
                    <a className="hover:text-red-400 transition-colors">Chuyên mục</a>
                  </Link>
                </li>
                <li>
                  <Link href="/about">
                    <a className="hover:text-red-400 transition-colors">Giới thiệu</a>
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Danh mục</h3>
              <ul className="space-y-2 text-sm">
                {categories.slice(0, 4).map((category) => (
                  <li key={category.id}>
                    <button
                      onClick={() => {
                        setActiveCategory(category.id);
                        handleSearch({ preventDefault: () => {} });
                        setSearchOpen(true);
                      }}
                      className="hover:text-red-400 transition-colors"
                    >
                      {category.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Liên hệ</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="mailto:support@streios.com" className="hover:text-red-400 transition-colors">
                    Email: support@streios.com
                  </a>
                </li>
                <li>
                  <a href="https://t.me/streios" className="hover:text-red-400 transition-colors">
                    Telegram: @streios
                  </a>
                </li>
                <li>
                  <a href="https://x.com/streios" className="hover:text-red-400 transition-colors">
                    X: @streios
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="max-w-screen-2xl mx-auto px-4 mt-8 pt-8 border-t border-gray-700 text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} StreiOS. All rights reserved.
          </div>
        </footer>
      </div>
  );
}