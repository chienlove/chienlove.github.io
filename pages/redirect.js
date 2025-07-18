import { useEffect, useState } from 'react';
import Head from 'next/head';

export default function RedirectPage({ url: initialUrl = '', name: initialName = '' }) {
  const [countdown, setCountdown] = useState(5);
  const [redirecting, setRedirecting] = useState(false);
  const [decodedUrl, setDecodedUrl] = useState('');
  const [decodedName, setDecodedName] = useState('');
  const [progress, setProgress] = useState(100); // % of progress

  // Giải mã URL và tên
  useEffect(() => {
    if (!initialUrl) return;

    try {
      setDecodedUrl(decodeURIComponent(initialUrl));
    } catch (e) {
      console.error('Lỗi giải mã URL:', e);
      window.location.href = '/';
    }

    try {
      setDecodedName(initialName ? decodeURIComponent(initialName) : '');
    } catch (e) {
      setDecodedName('');
    }
  }, [initialUrl, initialName]);

  // Tính toán hiệu ứng đếm ngược mượt mà theo thời gian thực
  useEffect(() => {
    if (!decodedUrl || redirecting) return;

    const startTime = Date.now();
    const duration = countdown * 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(duration - elapsed, 0);
      const newProgress = (remainingTime / duration) * 100;

      setProgress(newProgress);

      if (remainingTime <= 0) {
        setRedirecting(true);
        window.location.href = decodedUrl;
      } else {
        requestAnimationFrame(animate);
      }
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [decodedUrl, redirecting]);

  // Cập nhật trạng thái countdown (chỉ để hiển thị số)
  useEffect(() => {
    if (!decodedUrl || redirecting) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [decodedUrl, redirecting]);

  // Tính toán đường tròn SVG
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference * (progress / 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <Head>
        <title>Đang chuyển hướng...</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden transition-all duration-300 hover:shadow-2xl">
        <div className="p-6 sm:p-8 text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dashoffset 0.1s linear' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{Math.ceil(progress / 20)}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {redirecting ? 'Đang chuyển hướng...' : 'Đang chuẩn bị tải xuống'}
          </h1>
          <p className="text-gray-600 mb-6">
            Ứng dụng{' '}
            <span className="font-semibold text-blue-600">
              {decodedName || 'này'}
            </span>{' '}
            sẽ được tải xuống {redirecting ? 'ngay bây giờ' : `sau ${countdown} giây`}
          </p>

          <div className="space-y-3">
            {redirecting && (
              <a
                href={decodedUrl}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
              >
                Tải xuống ngay
              </a>
            )}
            <button
              onClick={() => (window.location.href = '/')}
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 active:scale-95 border border-gray-300"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Đảm bảo bạn tin tưởng nguồn tải xuống này
          </p>
        </div>
      </div>
    </div>
  );
}

// Simulate getServerSideProps
export async function getServerSideProps(context) {
  const { url, name } = context.query;
  return {
    props: {
      url: url || '',
      name: name || '',
    },
  };
}