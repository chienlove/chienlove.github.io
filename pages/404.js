import { useState, useEffect } from "react";

export default function App() {
  const [glitchText, setGlitchText] = useState("404");
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Tạo hiệu ứng glitch cho chữ "404"
  useEffect(() => {
    const interval = setInterval(() => {
      const newText = Math.random() > 0.5 ? "ERROR" : "404";
      setGlitchText(newText);
    }, 800);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-wider">ERROR</h1>
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-full hover:bg-gray-700 dark:hover:bg-gray-300 transition"
        >
          {isDarkMode ? (
            <SunIcon />
          ) : (
            <MoonIcon />
          )}
        </button>
      </header>

      {/* Main Content */}
      <main className="flex flex-col items-center text-center space-y-8">
        <div className="relative">
          <h2 className="text-8xl md:text-9xl font-extrabold tracking-wider glitch-text">
            {glitchText}
          </h2>
          <div className="absolute -top-2 -left-4 w-full h-full pointer-events-none">
            <span className="text-red-500 opacity-30 block transform -skew-x-12 text-8xl md:text-9xl font-extrabold">{glitchText}</span>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl md:text-3xl font-semibold">Oops! Page Not Found</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            The page you're looking for might have been removed, had its name changed, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-4">
          <a
            href="#"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-pink-500 hover:to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            Take Me Home
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="absolute bottom-0 left-0 w-full p-6 text-sm text-gray-500 text-center">
        &copy; {new Date().getFullYear()} Your Company Name. All rights reserved.
      </footer>

      {/* Background Effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
    </div>
  );
}

// SVG Icons
function MoonIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
  );
}