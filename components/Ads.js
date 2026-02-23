'use client';

import { useEffect, useRef, useState, memo } from 'react';
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
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'unit',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) => {
  const wrapperRef = useRef(null);
  const [layout, setLayout] = useState('unknown');
  const [shouldRender, setShouldRender] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLayout(window.innerWidth >= 768 ? 'desktop' : 'mobile');
    const timer = setTimeout(() => setShouldRender(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!shouldRender || layout === 'unknown') return;
    const root = wrapperRef.current;
    if (!root) return;

    let pushed = false;
    const tryPush = () => {
      if (pushed) return;
      const ins = root.querySelector('ins.adsbygoogle');
      if (!ins) return;

      if (ins.innerHTML.trim() === '' && ins.getAttribute('data-load-status') !== 'done') {
        ins.setAttribute('data-load-status', 'done');
        pushAdsense();
        pushed = true;
      }
    };

    const t = setTimeout(tryPush, 300);
    return () => clearTimeout(t);
  }, [shouldRender, layout, router.asPath]);

  // Nếu chưa render xong môi trường, tạo một bộ khung trống giữ chỗ để không giật layout
  if (!shouldRender || layout === 'unknown') {
    return <div className={`w-full min-h-[100px] ${className}`} />;
  }

  // --- THIẾT LẬP SLOT VÀ ĐỊNH DẠNG ---
  let adSlot = mobileSlot2;
  let adFormat = "auto";
  let adStyle = { display: 'block', width: '100%', minHeight: '250px' };

  if (isArticleAd) {
    // 1. Trong bài viết (Mobile & PC)
    adSlot = inArticleSlot;
    adFormat = "rectangle"; // Ép hình chữ nhật để hiện ảnh/video to đẹp
  } else if (layout === 'desktop') {
    // 2. Màn hình Máy tính (Sửa lỗi trắng banner)
    adSlot = desktopSlot;
    adFormat = "auto"; // Để auto, Google sẽ tự tính toán chiều ngang không gây crash
    adStyle = { display: 'block', width: '100%' }; // Thả tự do chiều cao, không ép minHeight để chống xung đột
  } else {
    // 3. Màn hình Điện thoại (Trang chủ và Top)
    adSlot = mobileVariant === 'compact' ? mobileSlot1 : mobileSlot2;
    // QUAN TRỌNG: Ép rectangle trên toàn bộ mobile để triệt tiêu vĩnh viễn quảng cáo Text lèo tèo "Khám phá thêm"
    adFormat = "rectangle"; 
    adStyle = { display: 'block', width: '100%', minHeight: '250px' }; // Khóa cứng 250px giữ chỗ chống click nhầm
  }

  // Đã gỡ bỏ class "overflow-hidden" ở div ngoài cùng để Google không bị lỗi tính toán kích thước
  return (
    <div ref={wrapperRef} className={`w-full flex justify-center ${className}`}>
       <ins
        className="adsbygoogle"
        style={adStyle}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive="true"
      />
    </div>
  );
}

export default memo(AdUnit);
