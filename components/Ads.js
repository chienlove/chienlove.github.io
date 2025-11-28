// components/Ads.js (SỬA LỖI NO_DIV BẰNG CÁCH BUỘC KÍCH THƯỚC)
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
        msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them") ||
        msg.includes('no_div') // Bổ sung để nuốt lỗi này
      )
    ) {
      return; // Bỏ qua lỗi TagError thông thường
    }

    // console.error(
    //   'Adsense push error (global):',
    //   e ? e : 'Unknown AdSense push error'
    // );
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250 (compact)
  mobileSlot2 = '7109430646',       // (multiplex/auto)
  desktopMode = 'auto',             // 'auto' | 'unit'
  desktopSlot = '4575220124',

  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);
  
  // TẠO KEY RIÊNG để force React tái tạo component AdUnit
  const adKey = `${mobileVariant}-${desktopMode}`; 

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
          if (!ins.getBoundingClientRect) return false;

          const rect = ins.getBoundingClientRect();
          // ✅ Kiểm tra width > 0 VÀ height > 0 (đặc biệt quan trọng cho compact 300x250)
          const isReady = rect.width > 0 && rect.height > 0; 
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
        // Fix: Xóa data-ad-loaded cho các phần tử đang bị ẩn hoặc kích thước 0 khi resize
        entries.forEach(entry => {
          const ins = entry.target;
          const rect = ins.getBoundingClientRect();
          if ((rect.width === 0 || rect.height === 0) && ins.dataset.adLoaded === '1') {
             delete ins.dataset.adLoaded;
          }
        });
        
        // Kiểm tra và push lại nếu cần
        pushIfNeeded();
      });

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    // Thêm một setTimeout ngắn để đảm bảo DOM đã render và style đã áp dụng
    const initialTimeout = setTimeout(pushIfNeeded, 100); 
    
    // Thêm listener cho sự kiện load của window, đôi khi Adsense cần tải sau khi load DOM hoàn tất
    window.addEventListener('load', pushIfNeeded);

    return () => {
      clearTimeout(initialTimeout);
      disposed = true;
      if (observer) {
        observer.disconnect();
      }

      window.removeEventListener('load', pushIfNeeded);

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => {
        delete ins.dataset.adLoaded;
      });
    };
  }, [adKey]); // Dùng adKey làm dependency

  // --- JSX Rendering ---

  if (isArticleAd) {
    // ... giữ nguyên
  }

  return (
    <div key={adKey} ref={wrapperRef} className={`w-full ${className}`}> 
      {/* Mobile */}
      <div className="block md:hidden w-full">
        {mobileVariant === 'compact' ? (
          <div className="w-full flex justify-center">
            {/* ✅ SỬA: Dùng inline-block VÀ kích thước cứng để tránh lỗi no_div */}
            <ins
              className="adsbygoogle"
              style={{ display: 'inline-block', width: '300px', height: '250px' }} 
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
