// components/Ads.js
'use client';

import { useEffect, useRef, useState } from 'react';

// Hàm helper để gọi window.adsbygoogle.push({})
function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    const msg = e && typeof e.message === 'string' ? e.message : '';

    // 1) Bỏ qua lỗi "No slot size for availableWidth=0"
    if (msg.includes('No slot size for availableWidth=0')) {
      return;
    }

    // 2) Bỏ qua lỗi khi tất cả ins.adsbygoogle đã có quảng cáo
    if (msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them.")) {
      return;
    }

    console.error('Adsense push error (global):', e ? e : 'Unknown AdSense push error');
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250 (Main Site Global)
  mobileSlot2 = '7109430646',       // Multiplex
  desktopMode = 'auto',             // 'auto' | 'unit'
  desktopSlot = '4575220124',       // Ads Desktop

  // In-article
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);
  const [layout, setLayout] = useState('unknown');

  // Xác định layout (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
      if (desktopMode === 'unit' && w >= 768) {
        setLayout('desktop');
      } else {
        setLayout('mobile');
      }
    };

    detect();
    
    // Thêm listener resize để cập nhật layout khi xoay màn hình
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, [desktopMode]);

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

      const visible = list.filter((ins) => {
        const status = ins.getAttribute('data-adsbygoogle-status');
        return (
          ins.offsetParent !== null &&
          ins.dataset.adLoaded !== '1' &&
          status !== 'done'
        );
      });

      if (!visible.length) return;

      const ready = visible.filter((ins) => {
        if (!ins.getBoundingClientRect) return false;
        const rect = ins.getBoundingClientRect();
        return rect.width > 0;
      });

      if (!ready.length) return;

      ready.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });

      pushAdsense();
    };

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        pushIfNeeded();
      });
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    pushIfNeeded();

    return () => {
      disposed = true;
      if (observer) observer.disconnect();
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => {
        delete ins.dataset.adLoaded;
      });
    };
  }, [mobileVariant, mobileSlot1, mobileSlot2, desktopMode, desktopSlot, inArticleSlot, isArticleAd, layout]);

  // ======================= JSX Rendering =======================

  // Class chung: Thêm overflow-hidden để cắt phần thừa nếu Adsense cố tình render lố
  const containerClass = `w-full overflow-hidden ${className}`;

  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={containerClass}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center', width: '100%' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="auto"
          data-full-width-responsive="false" 
        />
      </div>
    );
  }

  if (layout === 'unknown') {
    return <div ref={wrapperRef} className={containerClass} />;
  }

  return (
    <div ref={wrapperRef} className={containerClass}>
      {/* MOBILE ONLY */}
      {layout === 'mobile' && (
        <div className="w-full">
          {mobileVariant === 'compact' ? (
            <div className="w-full flex justify-center">
              {/* ✅ ĐÃ SỬA: data-full-width-responsive="false" để tôn trọng padding của Card */}
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%' }} 
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileSlot1}
                data-ad-format="auto" 
                data-full-width-responsive="false"
              />
            </div>
          ) : (
            <div className="w-full">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%' }}
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileSlot2}
                data-ad-format="auto"
                data-full-width-responsive="false"
              />
            </div>
          )}
        </div>
      )}

      {/* DESKTOP ONLY */}
      {layout === 'desktop' && desktopMode === 'unit' && (
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopSlot}
            data-ad-format="auto"
            data-full-width-responsive="true" 
          />
          {/* Desktop có thể để true vì không gian rộng, nhưng nếu vẫn bị tràn thì sửa thành false */}
        </div>
      )}

      {/* Desktop Auto (Multiplex fallback) */}
      {layout === 'desktop' && desktopMode === 'auto' && (
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}
