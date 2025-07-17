// components/AdBanner.js
import { useEffect, useState } from 'react';
import Script from 'next/script';

export default function AdBanner({ className = '' }) {
  const [adLoaded, setAdLoaded] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.adsbygoogle) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdLoaded(true);
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  return (
    <div className={`w-full my-4 ${className}`}>
      {/* Chỉ hiển thị trong production */}
      {process.env.NODE_ENV === 'production' ? (
        <>
          <Script
            id="adsbygoogle-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (adsbygoogle = window.adsbygoogle || []).push({
                  google_ad_client: "ca-pub-3905625903416797",
                  enable_page_level_ads: true
                });
              `,
            }}
          />
          <div className="min-h-[90px] md:min-h-[250px] w-full bg-gray-100 flex items-center justify-center">
            <ins
              className="adsbygoogle block"
              style={{
                display: 'block',
                minWidth: 300,
                minHeight: 250,
                width: '100%',
                height: '100%'
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