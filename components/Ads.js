// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Hai ad unit tách biệt:
 * - Mobile: 300x250
 * - Desktop: 728x90
 * Có retry đợi script sẵn sàng, đẩy khi vào viewport.
 */
export default function AdUnit({
  mobileSlot = '5160182988',   // slot 300x250
  desktopSlot = '4575220124',  // slot 728x90 (bạn vừa set fixed trong AdSense)
  className = '',
  label = 'Quảng cáo',
}) {
  const mobileRef = useRef(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    const tryPush = (el) => {
      if (!el) return;
      let attempts = 0;
      const max = 40; // ~10s (40 * 250ms)
      const tick = () => {
        try {
          if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
          if (typeof window !== 'undefined' && window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
            window.adsbygoogle.push({});
          } else if (attempts < max) {
            attempts += 1;
            setTimeout(tick, 250);
          }
        } catch (_) {
          // nuốt lỗi nhẹ (adblock, v.v.)
        }
      };
      tick();
    };

    const observe = (el) => {
      if (!el) return () => {};
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                tryPush(el);
                io.unobserve(el);
              }
            });
          },
          { rootMargin: '200px' }
        );
        io.observe(el);
        return () => io.disconnect();
      } else {
        tryPush(el);
        return () => {};
      }
    };

    const unMobile = observe(mobileRef.current);
    const unDesktop = observe(desktopRef.current);
    return () => {
      unMobile && unMobile();
      unDesktop && unDesktop();
    };
  }, []);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-1">{label}</span>

      {/* Mobile: 300x250 */}
      <div className="block md:hidden w-full">
        <ins
          ref={mobileRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '300px',
            height: '250px',
            margin: '0 auto',
            minHeight: '250px', // giữ chỗ tránh CLS
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot}
          // ❌ không đặt data-ad-format cho fixed size
          data-full-width-responsive="false"
        />
      </div>

      {/* Desktop: 728x90 */}
      <div className="hidden md:block w-full" style={{ maxWidth: 1000 }}>
        <ins
          ref={desktopRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '728px',
            height: '90px',
            margin: '0 auto',
            minHeight: '90px',
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={desktopSlot}
          // ❌ không đặt data-ad-format cho fixed size
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
}