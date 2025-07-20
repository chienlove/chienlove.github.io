// components/ManualBannerAd.js
import { useEffect } from 'react';
import Script from 'next/script';

export default function AdBanner({ className = '', slot = '5160182988' }) {
  useEffect(() => {
    const tryPushAd = () => {
      try {
        if (window.adsbygoogle && window.adsbygoogle.push) {
          window.adsbygoogle.push({});
        } else {
          setTimeout(tryPushAd, 100);
        }
      } catch (e) {
        console.error('AdSense push error:', e);
      }
    };
    
    tryPushAd();
  }, []);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-1">Quảng cáo</span>

      <Script
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
        crossOrigin="anonymous"
        onLoad={() => {
          // Kích hoạt lại quảng cáo sau khi script tải
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }}
      />

      {/* Mobile: Cố định hình vuông */}
      <div className="block md:hidden">
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '300px',
            height: '250px',
            margin: '0 auto'
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={slot}
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
      </div>

      {/* PC: Tự động điều chỉnh */}
      <div className="hidden md:block w-full" style={{ maxWidth: '1200px' }}>
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '100%',
            minHeight: '250px',
            margin: '0 auto'
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={slot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}