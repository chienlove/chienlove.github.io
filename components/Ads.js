// components/Ads.js
'use client';

import { useEffect } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact', // 'compact' | 'multiplex'
  mobileSlot1,
  mobileSlot2,
}) {
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.adsbygoogle) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense push error:', e);
    }
  }, []);

  // Mobile ads
  const renderMobileAd = () => {
    if (mobileVariant === 'multiplex') {
      return (
        <div className="adsbygoogle-wrapper">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2}
            data-ad-format="autorelaxed"
            data-full-width-responsive="true"
          ></ins>
        </div>
      );
    }

    // compact
    return (
      <div className="adsbygoogle-wrapper">
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot1}
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </div>
    );
  };

  return (
    <div className={`my-4 ${className}`}>
      {/* Mobile only */}
      <div className="block md:hidden">{renderMobileAd()}</div>

      {/* Desktop: Auto Ads lo toàn bộ (đã load trong _document.js) */}
      <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400 text-center">
        {/* Không render ins => để Auto Ads quyết định */}
        Quảng cáo
      </div>

      <style jsx>{`
        .adsbygoogle-wrapper {
          overflow: hidden;
          border-radius: inherit;
        }
        .adsbygoogle-wrapper ins.adsbygoogle {
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );
}