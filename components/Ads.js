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

    const detect = () => {
      setLayout(window.innerWidth >= 768 ? 'desktop' : 'mobile');
    };

    detect();
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

      // Kiểm tra xem quảng cáo đã được push chưa để tránh push trùng
      if (ins.innerHTML.trim() === '' && ins.getAttribute('data-load-status') !== 'done') {
        ins.setAttribute('data-load-status', 'done');
        pushAdsense();
        pushed = true;
      }
    };

    const t = setTimeout(tryPush, 300);
    return () => clearTimeout(t);
  }, [shouldRender, layout, router.asPath]);

  // 1. CHỐT KÍCH THƯỚC CỐ ĐỊNH CHO TỪNG LOẠI THIẾT BỊ VÀ VỊ TRÍ
  let adWidth, adHeight, adSlot;

  if (isArticleAd) {
    // Trong bài viết: Dùng hình chữ nhật trung bình
    adWidth = 300;
    adHeight = 250;
    adSlot = inArticleSlot;
  } else if (layout === 'desktop') {
    // Máy tính: Dùng hình chữ nhật lớn
    adWidth = 336; 
    adHeight = 280;
    adSlot = desktopMode === 'unit' ? desktopSlot : mobileSlot2;
  } else {
    // Điện thoại: ĐÂY LÀ CHỖ QUAN TRỌNG NHẤT
    if (mobileVariant === 'compact') {
      // Dùng Banner 320x100: Đủ to để thấy, nhưng đủ dẹt để KHÔNG BỊ CLICK NHẦM khi cuộn
      adWidth = 320; 
      adHeight = 100;
      adSlot = mobileSlot1;
    } else {
      // Các vị trí cuối trang (không nguy hiểm) dùng 300x250
      adWidth = 300; 
      adHeight = 250;
      adSlot = mobileSlot2;
    }
  }

  // 2. ÉP KHUNG CONTAINER BÊN NGOÀI
  // Khóa cứng không gian ngay từ đầu, loại bỏ hiện tượng giật cục trang web
  const containerStyle = {
    width: `${adWidth}px`,
    height: `${adHeight}px`,
    margin: '0 auto',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  // 3. ÉP KÍCH THƯỚC THẺ INS CỦA GOOGLE
  const insStyle = {
    display: 'inline-block',
    width: `${adWidth}px`,
    height: `${adHeight}px`,
  };

  return (
    <div ref={wrapperRef} className={`ad-wrapper flex justify-center w-full ${className}`}>
      {shouldRender && layout !== 'unknown' && (
        <div style={containerStyle}>
          <ins
            className="adsbygoogle"
            style={insStyle}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={adSlot}
            // ĐÃ XÓA HOÀN TOÀN: data-ad-format="auto" và data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}

export default memo(AdUnit);
