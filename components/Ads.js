// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'auto',
  desktopSlot = '4575220124',
}) {
  const adRef = useRef(null); // Chỉ cần 1 ref là đủ

  useEffect(() => {
    const pushAd = () => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("Ad push error:", e);
      }
    };

    // Sử dụng IntersectionObserver để chỉ tải quảng cáo khi nó sắp hiển thị
    // Giúp cải thiện hiệu suất và tuân thủ chính sách của Google
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            pushAd();
            observer.unobserve(entry.target); // Chạy 1 lần rồi ngưng
          }
        });
      },
      { rootMargin: '200px' } // Tải trước khi nó vào màn hình 200px
    );

    if (adRef.current) {
      observer.observe(adRef.current);
    }

    return () => {
      if (adRef.current) {
        observer.unobserve(adRef.current);
      }
    };
  }, []); // useEffect chỉ chạy 1 lần

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile Ads */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // Dạng Compact (300x250) - Căn giữa
          <div className="w-full flex justify-center">
            <ins
              ref={adRef}
              className="adsbygoogle"
              style={{ display: 'block', width: '300px', height: '250px' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot1}
              data-full-width-responsive="false"
            />
          </div>
        ) : (
          // Dạng Multiplex - Để Google tự quản lý kích thước
          // Vùng chứa này sẽ không giới hạn chiều cao
          <div className="w-full">
            <ins
              ref={adRef}
              className="adsbygoogle"
              style={{ display: 'block' }} // Quan trọng: để block
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2}
              data-ad-format="autorelaxed"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop Ads */}
      {desktopMode === 'unit' && (
        <div className="hidden md:block w-full">
          <ins
            ref={adRef} // Có thể dùng chung ref nếu chỉ 1 quảng cáo hiển thị tại 1 thời điểm
            className="adsbygoogle"
            style={{ display: 'block' }} // Để Google tự quyết định kích thước
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}
