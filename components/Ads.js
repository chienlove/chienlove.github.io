// components/Ads.js
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
    // Nuốt riêng các TagError "vô hại" để không spam console
    const name = e && e.name;
    const msg = e && typeof e.message === 'string' ? e.message : '';

    if (
      name === 'TagError' &&
      (
        msg.includes('No slot size for availableWidth=0') ||
        msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them")
      )
    ) {
      // Bỏ qua hoàn toàn, vì đây là lỗi do push thừa / layout 0 width tạm thời
      return;
    }

    // Các lỗi khác vẫn log ra để dễ debug
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

    let disposed = false; // Biến cờ để kiểm soát việc unmount
    let observer = null;

    const pushIfNeeded = () => {
      if (disposed) return;
      if (typeof window === 'undefined') return;

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      // 1. Chỉ xử lý các ins đang thực sự hiển thị và chưa load
      const visible = list.filter(
        // Đảm bảo phần tử không bị display: none
        (ins) => ins.offsetParent !== null && ins.dataset.adLoaded !== '1'
      );

      if (!visible.length) return;

      // 2. Sửa lỗi triệt để cho "No slot size for availableWidth=0" VÀ FIX LỖI DESKTOP
      // Chỉ cần kiểm tra width > 0.
      const ready = visible.filter((ins) => {
        // Tăng cường kiểm tra null/undefined trước khi gọi getBoundingClientRect
        if (!ins.getBoundingClientRect) return false;

        const rect = ins.getBoundingClientRect();

        // Đối với quảng cáo responsive/auto, chỉ cần kiểm tra width > 0
        // để tránh lỗi availableWidth=0. KHÔNG cần check height > 0
        return rect.width > 0;
      });

      if (!ready.length) return; // KHÔNG push nếu chưa có kích thước hợp lệ

      // 3. Tiến hành push (chỉ các phần tử đã sẵn sàng)
      ready.forEach((ins) => {
        // Đánh dấu là đã được push để tránh lỗi "already have ads in them"
        ins.dataset.adLoaded = '1';
      });

      // Push chung
      pushAdsense();
    };

    // --- Khởi tạo và Cleanup ---

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        pushIfNeeded();
      });

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    // Gọi lần đầu sau khi mount
    pushIfNeeded();

    return () => {
      disposed = true;
      if (observer) {
        observer.disconnect();
      }

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