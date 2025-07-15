import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RedirectPage() {
  const router = useRouter();
  const { url, name } = router.query;
  const [countdown, setCountdown] = useState(15);
  const [progress, setProgress] = useState(100);
  const [redirecting, setRedirecting] = useState(false);
  const [decodedUrl, setDecodedUrl] = useState('');

  // Tính strokeDashoffset dựa trên countdown
  const strokeDashoffset = 283 * (countdown / 15);

  useEffect(() => {
    if (!url) {
      router.push('/');
      return;
    }

    try {
      setDecodedUrl(decodeURIComponent(url));
    } catch (e) {
      console.error('Lỗi giải mã URL:', e);
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        const newCount = prev - 1;
        if (newCount <= 0) {
          clearInterval(timer);
          setRedirecting(true);
          window.location.href = decodedUrl;
          return 0;
        }
        return newCount;
      });
      
      // Cập nhật progress dựa trên countdown mới
      setProgress((countdown - 1) * (100 / 15));
    }, 1000);

    return () => clearInterval(timer);
  }, [url, decodedUrl]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
      <Head>
        <title>Đang chuyển hướng...</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#e5e7eb"
                strokeWidth="8"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="283"
                strokeDashoffset={strokeDashoffset}
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-gray-800">{countdown}</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {redirecting ? 'Đang chuyển hướng...' : 'Đang chuẩn bị tải xuống'}
          </h1>
          <p className="text-gray-600 mb-6">
            Ứng dụng <span className="font-semibold">{name ? decodeURIComponent(name) : 'này'}</span> sẽ được tải xuống {redirecting ? 'ngay bây giờ' : `sau ${countdown} giây`}
          </p>

          <div className="space-y-3">
            {redirecting && (
              <a
                href={decodedUrl}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200"
              >
                Tải xuống ngay
              </a>
            )}
            <button
              onClick={() => router.push('/')}
              className="block w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Đảm bảo bạn tin tưởng nguồn tải xuống này
          </p>
        </div>
      </div>
    </div>
  );
}