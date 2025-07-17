// components/AdBanner.js
import { useState } from 'react';
import Script from 'next/script';

export default function AdBanner({ className = '' }) {
  const [adLoaded, setAdLoaded] = useState(false);

  return (
    <div className={`w-full my-4 ${className}`}>
      {/* Chỉ hiển thị trong production */}
      {process.env.NODE_ENV === 'production' ? (
        <>
          <Script
            strategy="afterInteractive"
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
            crossOrigin="anonymous"
            onLoad={() => {
              try {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
                setAdLoaded(true);
              } catch (e) {
                console.error('AdSense error:', e);
              }
            }}
          />
          <div className="w-full min-h-[280px] bg-gray-100 flex items-center justify-center">
            <ins
              className="adsbygoogle"
              style={{
                display: 'block',
                width: '100%',
                height: '280px',
                backgroundColor: '#f9f9f9'
              }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot="5160182988"
              data-ad-format="auto"
              data-full-width-responsive="true"
            ></ins>
          </div>
          {!adLoaded && (
            <div className="text-center text-sm text-gray-500 py-4">
              Đang tải quảng cáo...
            </div>
          )}
        </>
      ) : (
        <div className="bg-gray-200 p-8 text-center text-gray-500">
          [Vị trí quảng cáo - Chỉ hiển thị khi deploy]
        </div>
      )}
    </div>
  );
}