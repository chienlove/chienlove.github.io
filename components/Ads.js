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

  // --- CẤU HÌNH HIỂN THỊ QUẢNG CÁO TỐI ƯU ---
  if (!shouldRender || layout === 'unknown') {
    return <div className={`w-full min-h-[100px] ${className}`} />;
  }

  // 1. QUẢNG CÁO TRONG BÀI VIẾT (Giữ nguyên dạng hình chữ nhật đẹp như ảnh bạn chụp)
  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={`flex justify-center w-full overflow-hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '250px' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
      </div>
    );
  }

  // 2. MÁY TÍNH (Desktop)
  if (layout === 'desktop') {
    // Ép cứng kích thước 728x90 (Leaderboard banner)
    // Sẽ hiện một banner ảnh/video lớn nằm ngang, không bao giờ hiện text link
    return (
      <div ref={wrapperRef} className={`flex justify-center w-full overflow-hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'inline-block', width: '728px', height: '90px' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot2}
        />
      </div>
    );
  }

  // 3. ĐIỆN THOẠI (Mobile)
  if (mobileVariant === 'compact') {
    // Vị trí dễ click nhầm (Trang chủ / Top)
    // Ép cứng kích thước 320x100 (Large Mobile Banner)
    // Kích thước này đủ to để hiển thị ảnh đẹp, nhưng chiều cao 100px rất khó để cuộn nhầm.
    return (
      <div ref={wrapperRef} className={`flex justify-center w-full overflow-hidden ${className}`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'inline-block', width: '320px', height: '100px' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot1}
        />
      </div>
    );
  } else {
    // Vị trí Multiplex cuối trang (Ít nguy hiểm)
    return (
      <div ref={wrapperRef} className={`flex justify-center w-full overflow-hidden ${className}`}>
         <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', minHeight: '250px' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2}
          data-ad-format="rectangle"
          data-full-width-responsive="false"
        />
      </div>
    );
  }
}

export default memo(AdUnit);
