// components/ManualAd.js
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
    <div className={`my-6 w-full flex justify-center ${className}`}>
      <Script
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle"
        style={{ display: 'inline-block', width: 336, height: 280 }}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={slot}
      />
    </div>
  );
}