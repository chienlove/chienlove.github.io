// components/Ads.js (PHIÊN BẢN TÁCH BIỆT)
'use client';

import { useEffect, useRef } from 'react';

function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    const msg = e && typeof e.message === 'string' ? e.message : '';
    // Nuốt các lỗi Adsense vô hại
    if (e?.name === 'TagError' || msg.includes('No slot size') || msg.includes("already have ads")) {
      return; 
    }
    // console.error('Adsense push error (global):', e ? e : 'Unknown AdSense push error');
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988', 
  mobileSlot2 = '7109430646', 
  desktopSlot = '4575220124',
  
  // ✅ Thêm thuộc tính để xác định loại render
  isMobileOnly = false,
  isDesktopOnly = false,

  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    let disposed = false;
    let observer = null;

    const pushIfNeeded = () => {
      if (disposed || typeof window === 'undefined') return;

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      const ready = list.filter((ins) => {
        if (ins.dataset.adLoaded === '1') return false; 
        
        if (!ins.getBoundingClientRect) return false;
        
        const rect = ins.getBoundingClientRect();
        // Kiểm tra kích thước cứng
        return rect.width > 0 && rect.height > 0;
      });

      if (!ready.length) return;

      ready.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });
      pushAdsense();
    };

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        // Luôn push lại nếu có thay đổi kích thước, hoặc khi chuyển breakpoint
        pushIfNeeded();
      });

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    const initialTimeout = setTimeout(pushIfNeeded, 50); 

    return () => {
      clearTimeout(initialTimeout);
      disposed = true;
      if (observer) observer.disconnect();
      root.querySelectorAll('ins.adsbygoogle').forEach((ins) => delete ins.dataset.adLoaded);
    };
  }, [mobileVariant, mobileSlot1, mobileSlot2, desktopSlot, isArticleAd, isMobileOnly, isDesktopOnly]);

  // ======================= JSX Rendering =======================

  if (isArticleAd) {
    // Giữ nguyên logic In-Article
    return (
      <div ref={wrapperRef} className={`w-full ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }
  
  // Dành cho Mobile (compact / multiplex)
  if (isMobileOnly) {
    const slot = mobileVariant === 'compact' ? mobileSlot1 : mobileSlot2;
    const style = mobileVariant === 'compact' ? { display: 'block', width: '300px', height: '250px' } : { display: 'block' };

    return (
      <div ref={wrapperRef} className={`w-full ${className}`}>
        <div className="w-full flex justify-center">
            <ins
              className="adsbygoogle"
              style={style}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={slot}
              data-full-width-responsive={mobileVariant !== 'compact'}
            />
          </div>
      </div>
    );
  }

  // Dành cho Desktop (unit)
  if (isDesktopOnly) {
    return (
      <div ref={wrapperRef} className={`w-full ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={desktopSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }
  
  // Mặc định fallback (nếu không xác định rõ Mobile/Desktop, ví dụ quảng cáo chèn giữa)
  // Ta dùng slot responsive chung (mobileSlot2)
  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2} 
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
    </div>
  );
}
