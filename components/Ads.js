// components/Ads.js (TỐI ƯU HÓA ĐỒNG BỘ ADSENSE)
'use client';

import { useEffect, useRef } from 'react';

// Hàm helper để gọi window.adsbygoogle.push({})
function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    // Luôn nuốt các lỗi TagError và lỗi liên quan đến width/div để console sạch sẽ hơn
    const name = e && e.name;
    const msg = e && typeof e.message === 'string' ? e.message : '';
    if (
      name === 'TagError' || 
      msg.includes('No slot size for availableWidth=0') || 
      msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them") ||
      msg.includes('no_div')
    ) {
      return; 
    }
    // console.error('Adsense push error (global):', e ? e : 'Unknown AdSense push error');
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250
  mobileSlot2 = '7109430646',       // "multiplex"
  desktopMode = 'unit',             // 'auto' | 'unit'
  desktopSlot = '4575220124',

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

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      // ✅ Dùng getBoundingClientRect để kiểm tra kích thước thực tế
      const ready = list.filter((ins) => {
        // Nếu phần tử đã được đánh dấu là đã tải, bỏ qua
        if (ins.dataset.adLoaded === '1') return false; 
        
        if (!ins.getBoundingClientRect) return false;
        
        const rect = ins.getBoundingClientRect();
        // Cần width > 0 VÀ height > 0 (đảm bảo nó không bị ẩn bằng display: none)
        // Lưu ý: với ad-format="auto", Adsense có thể tự điều chỉnh height sau, nhưng ta cần 
        // kích thước ban đầu đủ lớn để nó khởi tạo.
        return rect.width > 0 && rect.height > 0;
      });

      if (!ready.length) return;

      // Đánh dấu đã load, tránh push lặp
      ready.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });

      // Push global
      pushAdsense();
    };

    // Theo dõi thay đổi kích thước của ins
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver((entries) => {
        entries.forEach(entry => {
          const ins = entry.target;
          const rect = ins.getBoundingClientRect();
          // Nếu kích thước về 0 hoặc bị ẩn (ví dụ: chuyển breakpoint), xóa dấu đã tải
          if ((rect.width === 0 || rect.height === 0) && ins.dataset.adLoaded === '1') {
             delete ins.dataset.adLoaded;
          }
        });
        pushIfNeeded();
      });

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    // Push lần đầu (thêm timeout ngắn để đảm bảo DOM đã render và đo đạc xong)
    const initialTimeout = setTimeout(pushIfNeeded, 50); 

    return () => {
      clearTimeout(initialTimeout);
      disposed = true;
      if (observer) observer.disconnect();

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

  // ======================= JSX Rendering =======================

  // Quảng cáo in-article
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
      {/* MOBILE (Màn hình < md) */}
      <div className="block md:hidden w-full">
        {mobileVariant === 'compact' ? (
          <div className="w-full flex justify-center">
            {/* COMPACT: Kích thước cứng 300x250 */}
            <ins
              className="adsbygoogle"
              style={{ display: 'block', width: '300px', height: '250px' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot1} // 5160182988
              data-full-width-responsive="false"
            />
          </div>
        ) : (
          <div className="w-full">
            {/* MULTIPLEX/AUTO: Tự động responsive */}
            <ins
              className="adsbygoogle"
              style={{ display: 'block' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2} // 7109430646
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* DESKTOP (Màn hình >= md) */}
      <div className="hidden md:block w-full">
        {/* DESKTOP MODE: UNIT */}
        {desktopMode === 'unit' && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopSlot} // 4575220124
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
        
        {/* DESKTOP MODE: AUTO (Dùng slot mobile responsive) */}
        {desktopMode === 'auto' && (
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2} // 7109430646
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        )}
      </div>
    </div>
  );
}
