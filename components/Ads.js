// components/Ads.js (ĐÃ SỬA TRIỆT ĐỂ LOGIC TẢI ADSENSE)
'use client';

import { useEffect, useRef } from 'react';

// Hàm helper để gọi window.adsbygoogle.push({})
function pushAdsense() {
  try {
    const w = window;
    // Kiểm tra và đẩy vào hàng đợi Adsense
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    const name = e && e.name;
    const msg = e && typeof e.message === 'string' ? e.message : '';

    if (
      name === 'TagError' &&
      (
        msg.includes('No slot size for availableWidth=0') ||
        msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them")
      )
    ) {
      return; // Bỏ qua lỗi TagError thông thường
    }

    console.error(
      'Adsense push error (global):',
      e ? e : 'Unknown AdSense push error'
    );
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250
  mobileSlot2 = '7109430646',       // "multiplex" nhưng ta render dạng auto
  desktopMode = 'auto',             // 'auto' | 'unit'
  desktopSlot = '4575220124',

  // In-article
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
      if (disposed) return;
      if (typeof window === 'undefined') return;

      const insList = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!insList.length) return;

      const visibleIns = insList.filter(
        (ins) => {
          // Chỉ lấy các ins có width > 0 VÀ chưa được đánh dấu là đã tải.
          // ins.offsetParent !== null kiểm tra phần tử có bị display: none hay không,
          // nhưng kiểm tra width an toàn hơn.
          if (!ins.getBoundingClientRect) return false;

          const rect = ins.getBoundingClientRect();
          const isReady = rect.width > 0;
          const isLoaded = ins.dataset.adLoaded === '1';

          return isReady && !isLoaded;
        }
      );

      if (!visibleIns.length) return;

      // Đánh dấu và tiến hành push cho các phần tử đã sẵn sàng
      visibleIns.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });

      // Gọi push chung
      pushAdsense();
    };

    // --- Khởi tạo và Cleanup ---

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver((entries) => {
        // Fix: Xóa data-ad-loaded cho các phần tử đang bị ẩn khi resize
        entries.forEach(entry => {
          const ins = entry.target;
          if (entry.contentRect.width === 0 && ins.dataset.adLoaded === '1') {
             // Xóa data-ad-loaded để khi nó hiện lại, nó sẽ được push
             delete ins.dataset.adLoaded;
          }
        });
        
        // Kiểm tra và push lại nếu cần
        pushIfNeeded();
      });

      // Chỉ theo dõi các phần tử <ins>
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    // Gọi lần đầu sau khi mount
    pushIfNeeded();
    
    // Thêm listener cho sự kiện load của window, đôi khi Adsense cần tải sau khi load DOM hoàn tất
    window.addEventListener('load', pushIfNeeded);

    return () => {
      disposed = true;
      if (observer) {
        observer.disconnect();
      }

      window.removeEventListener('load', pushIfNeeded);

      // Cleanup dataset khi unmount để tránh lỗi nếu component được dùng lại
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => {
        delete ins.dataset.adLoaded;
      });
    };
  }, [
    mobileVariant,
    mobileSlot1,
    mobileSlot2,
    desktopMode,
    desktopSlot,
    inArticleSlot,
    isArticleAd,
  ]);

  // --- JSX Rendering (Giữ nguyên cấu trúc) ---

  if (isArticleAd) {
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

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {/* Mobile */}
      <div className="block md:hidden w-full">
        {mobileVariant === 'compact' ? (
          <div className="w-full flex justify-center">
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '300px', height: '250px' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot1}
              data-full-width-responsive="false"
            />
          </div>
        ) : (
          <div className="w-full">
            <ins
              className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop */}
      {desktopMode === 'unit' && (
        <div className="hidden md:block w-full">
          <ins
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
