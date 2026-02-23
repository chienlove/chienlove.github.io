'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

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

    const pushAd = () => {
      try {
        // 1. SỬA LỖI availableWidth=0: Nếu DOM chưa kịp load CSS (width = 0), chờ thêm 100ms
        if (ins.offsetWidth === 0) {
          setTimeout(pushAd, 100);
          return;
        }

        // 2. Chặn việc push trùng lặp
        if (ins.getAttribute('data-adsbygoogle-status') === 'done' || ins.innerHTML.trim() !== '') {
          return;
        }

        // Đánh dấu và gọi AdSense
        ins.setAttribute('data-load-status', 'loading');
        const w = window;
        w.adsbygoogle = w.adsbygoogle || [];
        w.adsbygoogle.push({});
      } catch (e) {
        console.error("AdSense push error:", e);
      }
    };

    // Khởi động hàm pushAd sau một khoảng trễ nhỏ
    const timer = setTimeout(pushAd, 150);

    return () => clearTimeout(timer);
  }, [router.asPath]); // Chỉ chạy lại khi đổi URL trang

  // 1. QUẢNG CÁO TRONG BÀI VIẾT
  if (isArticleAd) {
    return (
      <div className={`w-full overflow-hidden text-center my-4 ${className}`}>
        <ins
          ref={insRef}
          className="adsbygoogle block"
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
          ref={insRef}
          className="adsbygoogle block"
          data-ad-format="autorelaxed"
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2}
        />
      </div>
    );
  }

  // 3. QUẢNG CÁO CHUNG (Responsive) - SỬA LỖI MẤT TRÊN DESKTOP & QUÁ TO TRÊN MOBILE
  return (
    <div className={`w-full overflow-hidden block text-center min-h-[90px] ${className}`}>
      <ins
        ref={insRef}
        // Loại bỏ hoàn toàn style={{...}}, chỉ dùng class Tailwind để React không dọn dẹp DOM của AdSense
        className="adsbygoogle block mx-auto w-full max-h-[100px]"
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot1}
        // Ép quảng cáo dạng ngang để tránh hiển thị hình chữ nhật lớn chiếm màn hình
        data-ad-format="horizontal" 
        data-full-width-responsive="false" 
      />
    </div>
  );
};

export default AdUnit;
