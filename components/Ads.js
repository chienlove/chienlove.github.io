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
  mobileVariant = 'auto', // Đổi mặc định thành auto để tối ưu doanh thu
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'unit',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
  isMultiplex = false, // Thêm flag cho multiplex thật
}) => {
  const insRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Chỉ chạy trên client
    if (typeof window === 'undefined' || !insRef.current) return;

    const ins = insRef.current;
    
    // Tránh push nhiều lần trên cùng một element khi React re-render router
    if (ins.getAttribute('data-adsbygoogle-status') === 'done' || ins.innerHTML.trim() !== '') {
      return;
    }

    // Đợi 1 chút để DOM ổn định rồi mới push
    const timer = setTimeout(() => {
      ins.setAttribute('data-load-status', 'loading');
      pushAdsense();
    }, 200);

    return () => clearTimeout(timer);
  }, [router.asPath]); // Re-run nếu đổi route, nhưng bị chặn bởi check bên trên nếu đã render

  // 1. QUẢNG CÁO TRONG BÀI VIẾT (Giữ nguyên, tối ưu tốt)
  if (isArticleAd) {
    return (
      <div className={`relative z-0 w-full overflow-hidden text-center my-4 ${className}`}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-layout="in-article"
          data-ad-format="fluid"
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
        />
      </div>
    );
  }

  // 2. QUẢNG CÁO MULTIPLEX (Dành cho cuối bài viết/cuối trang)
  if (isMultiplex) {
    return (
      <div className={`relative z-0 w-full overflow-hidden ${className}`}>
        <ins
          ref={insRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-format="autorelaxed" // ĐÂY LÀ KEY ĐỂ HIỆN MULTIPLEX
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2} // Dùng slot 2 hoặc tạo 1 slot multiplex riêng trên Adsense
        />
      </div>
    );
  }

    // 3. QUẢNG CÁO CHUNG (Responsive cho cả Desktop & Mobile)
  return (
    <div className={`relative z-0 w-full overflow-hidden block text-center min-h-[100px] ${className}`}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: 'block', margin: '0 auto', width: '100%' }}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot1}
        data-ad-format="rectangle, horizontal" 
        data-full-width-responsive="false" 
      />
    </div>
  );
};
export default AdUnit;
