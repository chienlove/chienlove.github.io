// components/ManualBannerAd.js
import { useEffect } from 'react';
import Script from 'next/script';

export default function AdBanner({ className = '', slot = '5160182988' }) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  }, []);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-1">Quảng cáo</span>

      <Script
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
        crossOrigin="anonymous"
      />

      {/* Quảng cáo cho mobile */}
      <div className="block md:hidden">
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '300px',
            height: '250px'
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={slot}
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
      </div>

      {/* Quảng cáo cho desktop */}
      <div className="hidden md:block">
        <ins
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '728px',
            height: '120px'
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={slot}
          data-ad-format="horizontal"
          data-auto-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}