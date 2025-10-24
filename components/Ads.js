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
  
  // === Thêm tham số cho Quảng cáo trong bài viết ===
  inArticleSlot = '4276741180',
  isArticleAd = false,
  // ===============================================
}) {
  const adRef = useRef(null); 

  useEffect(() => {
    const pushAd = () => {
      try {
        if (window.adsbygoogle) {
          window.adsbygoogle.push({});
        }
      } catch (e) {
        console.error("Ad push error:", e);
      }
    };

    const currentAdRef = adRef.current; 

    // IntersectionObserver chỉ tải quảng cáo khi nó sắp hiển thị
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            pushAd();
            observer.unobserve(entry.target); 
          }
        });
      },
      { rootMargin: '200px' } 
    );

    if (currentAdRef) {
      observer.observe(currentAdRef);
    }

    return () => {
      if (currentAdRef) {
        observer.unobserve(currentAdRef);
      }
    };
  }, []); 

  const isCompact = mobileVariant === 'compact';

  // === RENDER QUẢNG CÁO TRONG BÀI VIẾT (IN-ARTICLE AD) ===
  if (isArticleAd) {
    return (
      <div className={`w-full ${className} flex justify-center py-2`}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          // Sử dụng style display: block và format auto để tối ưu responsive
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="fluid" // Hoặc "auto" nếu bạn không cần tùy biến In-article
          data-full-width-responsive="true"
        />
      </div>
    );
  }
  // ========================================================

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
          <div className="w-full">
            <ins
              ref={adRef}
              className="adsbygoogle"
              style={{ display: 'block' }} 
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
            ref={adRef} 
            className="adsbygoogle"
            style={{ display: 'block' }} 
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
