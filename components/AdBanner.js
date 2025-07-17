// components/AdBanner.js
import Script from 'next/script';

export default function AdBanner({ className = '' }) {
  return (
    <div className={`w-full my-4 ${className}`}>
      {process.env.NODE_ENV === 'production' ? (
        <>
          {/* Chèn mã quảng cáo tự động như yêu cầu */}
          <Script
            strategy="afterInteractive"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
            crossOrigin="anonymous"
          />
        </>
      ) : (
        <div className="bg-gray-200 p-8 text-center text-gray-500">
          [Quảng cáo tự động – chỉ hiển thị khi deploy]
        </div>
      )}
    </div>
  );
}