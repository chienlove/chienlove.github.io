// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

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

    const pushIfNeeded = () => {
      if (disposed) return;
      if (typeof window === 'undefined') return;

      const w = window;
      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      // Chỉ xử lý các ins đang thực sự hiển thị và chưa load
      const visible = list.filter(
        (ins) => ins.offsetParent !== null && ins.dataset.adLoaded !== '1'
      );
      if (!visible.length) return;

      // Đảm bảo container đủ rộng (tránh availableWidth = 0)
      const ready = visible.filter((ins) => {
        const rect = ins.getBoundingClientRect?.();
        const width =
          (rect && rect.width) ||
          ins.parentElement?.getBoundingClientRect?.().width ||
          0;

        // Tối thiểu 120px cho an toàn (không dùng fluid nữa nên không cần 250)
        return width >= 120;
      });

      if (!ready.length) return;
      if (!w.adsbygoogle) {
        w.adsbygoogle = [];
      }

      try {
        w.adsbygoogle.push({});
        ready.forEach((ins) => {
          ins.dataset.adLoaded = '1';
        });
      } catch (e) {
        console.warn('Adsense push error:', e);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) pushIfNeeded();
        });
      },
      { rootMargin: '300px' }
    );

    io.observe(root);

    const onResize = () => pushIfNeeded();
    window.addEventListener('resize', onResize);

    // Không push ngay khi mount, đợi IO/resize để tránh width=0
    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      io.disconnect();
    };
  }, [mobileVariant, mobileSlot1, mobileSlot2, desktopMode, desktopSlot, inArticleSlot, isArticleAd]);

  const isCompact = mobileVariant === 'compact';

  // In-article: dùng auto, không fluid
  if (isArticleAd) {
    return (
      <div
        ref={wrapperRef}
        className={`w-full ${className} flex justify-center py-2`}
      >
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
        {isCompact ? (
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