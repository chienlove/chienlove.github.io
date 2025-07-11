import React, { useState, useEffect } from 'react';
import { Home, ArrowLeft, Zap, Star, Sparkles } from 'lucide-react';

export default function Custom404() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [glitchActive, setGlitchActive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    
    // Glitch effect interval
    const glitchInterval = setInterval(() => {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 200);
    }, 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearInterval(glitchInterval);
    };
  }, []);

  const FloatingElement = ({ children, delay = 0 }) => (
    <div 
      className="absolute animate-bounce"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: '3s'
      }}
    >
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute top-40 right-20 w-64 h-64 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>
      </div>

      {/* Floating stars */}
      <FloatingElement delay={0}>
        <Star className="text-yellow-400 w-4 h-4 absolute top-20 left-1/4" />
      </FloatingElement>
      <FloatingElement delay={1}>
        <Sparkles className="text-pink-400 w-5 h-5 absolute top-40 right-1/3" />
      </FloatingElement>
      <FloatingElement delay={2}>
        <Zap className="text-cyan-400 w-6 h-6 absolute bottom-40 left-1/2" />
      </FloatingElement>

      {/* Mouse follower */}
      <div 
        className="fixed w-6 h-6 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full pointer-events-none z-50 mix-blend-difference transition-all duration-75"
        style={{
          left: mousePosition.x - 12,
          top: mousePosition.y - 12,
          transform: 'translate(-50%, -50%)'
        }}
      ></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-8 max-w-2xl">
          {/* 404 Number with glitch effect */}
          <div className="relative">
            <h1 className={`text-8xl md:text-9xl font-black bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent select-none transition-all duration-200 ${glitchActive ? 'animate-pulse filter blur-sm' : ''}`}>
              404
            </h1>
            {glitchActive && (
              <h1 className="absolute top-0 left-0 w-full text-8xl md:text-9xl font-black text-red-500 opacity-70 transform translate-x-1 -translate-y-1 select-none">
                404
              </h1>
            )}
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold text-white">
              Oops! Trang không tồn tại
            </h2>
            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
              Có vẻ như trang bạn đang tìm kiếm đã biến mất vào không gian mạng. 
              Đừng lo lắng, chúng tôi sẽ đưa bạn về nhà an toàn!
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <button 
              onClick={() => window.history.back()}
              className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <ArrowLeft className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Quay lại</span>
            </button>
            
            <button 
              onClick={() => window.location.href = '/'}
              className="group relative px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 flex items-center space-x-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Home className="w-5 h-5 relative z-10" />
              <span className="relative z-10">Về trang chủ</span>
            </button>
          </div>

          {/* Status code info */}
          <div className="pt-8 text-center">
            <p className="text-gray-400 text-sm">
              Error Code: <span className="text-cyan-400 font-mono">404_NOT_FOUND</span>
            </p>
          </div>
        </div>
      </div>

      {/* Bottom wave decoration */}
      <div className="absolute bottom-0 left-0 w-full overflow-hidden">
        <svg 
          viewBox="0 0 1200 120" 
          preserveAspectRatio="none" 
          className="relative block w-full h-16"
        >
          <path 
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" 
            fill="url(#gradient)"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8B5CF6" />
              <stop offset="50%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#EC4899" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}