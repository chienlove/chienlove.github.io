'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

function pushAdsense() {
  try {
    const w = window;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.push({});
  } catch (e) {
    console.error("AdSense push error:", e);
  }
}

const AdUnit = ({
  className = '',
  mobileVariant = 'auto', 
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'unit',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
  isMultiplex = false,
}) => {
  const insRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined' || !insRef.current) return;

    const ins = insRef.current;
    
    if (ins.getAttribute('data-adsbygoogle-status') === 'done' || ins.innerHTML.trim() !== '') {
      return;
    }

    const timer = setTimeout(() => {
      ins.setAttribute('data-load-status', 'loading');
      pushAdsense();
    }, 200);

    return () => clearTimeout(timer);
  }, [router.asPath]); 

  // Tạo key độc nhất dựa trên URL để tránh dính DOM cũ khi Next.js chuyển trang
  const adKey = `ad-${router.asPath}-${isArticleAd ? 'article' : isMultiplex ? 'multi' : 'general'}`;

  // 1. QUẢNG CÁO TRONG BÀI VIẾT
  if (isArticleAd) {
    return (
      <div className={`w-full overflow-hidden text-center my-4 ${className}`}>
        <ins
          key={adKey}
          ref={insRef}
          // Thay style bằng Tailwind để React không ghi đè height của AdSense
          className="adsbygoogle block text-center"
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
        />
      </div>
    );
  }

  // 2. QUẢNG CÁO MULTIPLEX
  if (isMultiplex) {
    return (
      <div className={`w-full overflow-hidden ${className}`}>
        <ins
          key={adKey}
          ref={insRef}
          className="adsbygoogle block"
          data-ad-format="autorelaxed" 
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2}
        />
      </div>
    );
  }

  // 3. QUẢNG CÁO CHUNG (Responsive cho cả Desktop & Mobile)
  return (
    <div className={`w-full overflow-hidden block text-center min-h-[100px] ${className}`}>
      <ins
        key={adKey}
        ref={insRef}
        // Thay style bằng Tailwind class
        className="adsbygoogle block mx-auto w-full"
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot1}
        // Cho phép Google tự động định cỡ trên Desktop thay vì ép cứng
        data-ad-format="auto" 
        data-full-width-responsive="true" 
      />
    </div>
  );
};

export default AdUnit;
