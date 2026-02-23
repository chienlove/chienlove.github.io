'use client';

import { useEffect, useRef, memo } from 'react';
import { useRouter } from 'next/router';

const AdUnit = memo(({
  className = '',
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

    const pushAd = () => {
      try {
        const ins = insRef.current;
        if (!ins) return;

        // Xử lý lỗi width=0 và tránh push trùng
        if (ins.offsetWidth === 0) {
          setTimeout(pushAd, 150);
          return;
        }

        if (ins.getAttribute('data-adsbygoogle-status') === 'done') return;

        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    };

    // Chờ DOM ổn định hoàn toàn sau khi Hydration
    const timer = setTimeout(pushAd, 300);
    return () => clearTimeout(timer);
  }, [router.asPath]); // Chỉ chạy lại khi người dùng chuyển sang trang khác

  // Xác định Slot ID
  const adSlot = isArticleAd ? inArticleSlot : (isMultiplex ? mobileSlot2 : (desktopMode === 'unit' ? desktopSlot : mobileSlot1));

  return (
    <div 
      className={`w-full overflow-hidden flex justify-center items-center min-h-[90px] ${className}`}
      // Ngăn React cảnh báo khi AdSense thay đổi nội dung bên trong div này
      suppressHydrationWarning={true}
    >
      <ins
        ref={insRef}
        className="adsbygoogle block w-full"
        // Sửa CTR: Khóa chiều cao tối đa trên mobile/desktop để không hiện banner vuông to
        style={{ display: 'block', width: '100%', maxHeight: '100px' }} 
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={adSlot}
        data-ad-format={isMultiplex ? 'autorelaxed' : 'horizontal'}
        data-full-width-responsive="false"
        {...(isArticleAd && { "data-ad-layout": "in-article" })}
      />
    </div>
  );
});

// Đặt tên để debug dễ hơn
AdUnit.displayName = 'AdUnit';

export default AdUnit;
