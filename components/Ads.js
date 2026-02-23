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
    
    // Xác định thiết bị
    setLayout(window.innerWidth >= 768 ? 'desktop' : 'mobile');
    
    const timer = setTimeout(() => setShouldRender(true), 150);
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

  // CẤU HÌNH ĐỊNH DẠNG CHUẨN API GOOGLE
  let adSlot, adFormat;

  if (isArticleAd) {
    // Trong bài viết: Cho phép hình chữ nhật để lấp đầy không gian nội dung
    adSlot = inArticleSlot;
    adFormat = "rectangle";
  } else if (layout === 'desktop') {
    // MÁY TÍNH: Lệnh bắt buộc hiển thị dải ngang (vd: 728x90) -> Sửa lỗi hình vuông
    adSlot = desktopSlot;
    adFormat = "horizontal";
  } else {
    // ĐIỆN THOẠI
    if (mobileVariant === 'compact') {
      // Vị trí nhạy cảm dễ click nhầm: Lệnh bắt buộc hiển thị dải ngang mỏng (vd: 320x50, 320x100)
      adSlot = mobileSlot1;
      adFormat = "horizontal";
    } else {
      // Vị trí cuối trang an toàn: Hiển thị hình chữ nhật
      adSlot = mobileSlot2;
      adFormat = "rectangle";
    }
  }

  return (
    <div ref={wrapperRef} className={`ad-wrapper flex justify-center w-full overflow-hidden ${className}`}>
      {shouldRender && layout !== 'unknown' && (
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={adSlot}
          data-ad-format={adFormat}
          data-full-width-responsive="false"
        />
      )}
    </div>
  );
}

export default memo(AdUnit);
