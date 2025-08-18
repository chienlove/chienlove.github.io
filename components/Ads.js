// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

export default function AdUnit({
  // Slots
  mobileSlot1 = '5160182988',   // 300x250
  mobileSlot2 = '7109430646',   // Multiplex
  // Chọn biến thể mobile cho vị trí này
  mobileVariant = 'compact',     // 'compact' | 'multiplex'
  label = 'Quảng cáo',
  className = '',
  // Desktop fallback (tùy chọn)
  enableDesktopFallback = false,
  desktopFallbackSlot = '4575220124', // responsive slot (nếu dùng fallback)
}) {
  const mRef = useRef(null);
  const dFbRef = useRef(null);

  useEffect(() => {
    const canPush = () =>
      typeof window !== 'undefined' &&
      window.adsbygoogle &&
      typeof window.adsbygoogle.push === 'function';

    const tryPushWithRetry = (el, maxAttempts = 40, delay = 250) => {
      if (!el) return;
      let n = 0;
      const tick = () => {
        try {
          if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
          if (canPush()) window.adsbygoogle.push({});
          else if (n++ < maxAttempts) setTimeout(tick, delay);
        } catch (_) {}
      };
      tick();
    };

    const observe = (el) => {
      if (!el) return () => {};
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                tryPushWithRetry(el);
                io.unobserve(el);
              }
            });
          },
          { rootMargin: '200px' }
        );
        io.observe(el);
        return () => io.disconnect();
      } else {
        tryPushWithRetry(el);
        return () => {};
      }
    };

    const unM = observe(mRef.current);
    const unD = enableDesktopFallback ? observe(dFbRef.current) : () => {};
    return () => {
      unM && unM();
      unD && unD();
    };
  }, [enableDesktopFallback]);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-2">{label}</span>

      {/* ===== Mobile: CHỈ một block theo mobileVariant ===== */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // 300×250 (giữ kích thước cố định để tránh CLS)
          <ins
            ref={mRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: '300px',
              height: '250px',
              margin: '0 auto',
              minHeight: '250px',
            }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot1}
            data-full-width-responsive="false"
          />
        ) : (
          // Multiplex: cần data-ad-format="autorelaxed", KHÔNG ép width/height cố định
          <ins
            ref={mRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: '100%',
              margin: '0 auto',
              minHeight: '600px', // giữ chỗ giảm layout shift; có thể chỉnh 600–800
            }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2}
            data-ad-format="autorelaxed"
            data-full-width-responsive="true"
          />
        )}
      </div>

      {/* ===== Desktop: KHÔNG render thủ công – nhường Auto Ads ===== */}
      {/* (Tuỳ chọn) Fallback responsive cho desktop nếu muốn thêm 1 vị trí cố định */}
      {enableDesktopFallback && (
        <div className="hidden md:block w-full" style={{ maxWidth: 1100 }}>
          <ins
            ref={dFbRef}
            className="adsbygoogle"
            style={{ display: 'block', margin: '0.5rem auto 0' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopFallbackSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}