// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Dùng 2 ad unit tách biệt:
 * - Mobile: 300x250 (hiệu quả trên điện thoại)
 * - Desktop: 728x90 (leaderboard)
 *
 * Truyền slot riêng để tối ưu RPM theo thiết bị.
 * Nếu bạn chỉ có 1 slot, tạm thời truyền cùng 1 giá trị cho cả 2.
 */
export default function AdUnit({
  mobileSlot = '5160182988',   // <-- điền slot mobile (300x250)
  desktopSlot = '4575220124', // <-- điền slot desktop (728x90)
  className = '',
  label = 'Quảng cáo',
}) {
  const mobileRef = useRef(null);
  const desktopRef = useRef(null);

  useEffect(() => {
    const pushOnce = (el) => {
      try {
        if (!el) return;
        if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
        if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
          window.adsbygoogle.push({});
        }
      } catch (_) {}
    };

    const makeObserver = (el) => {
      if (!el) return null;
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                pushOnce(el);
                io.unobserve(el);
              }
            });
          },
          { rootMargin: '200px' }
        );
        io.observe(el);
        return io;
      } else {
        pushOnce(el);
        return null;
      }
    };

    const mObs = makeObserver(mobileRef.current);
    const dObs = makeObserver(desktopRef.current);
    return () => {
      mObs && mObs.disconnect();
      dObs && dObs.disconnect();
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
            // giữ chỗ tránh CLS
            minHeight: '250px',
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot}
          data-ad-format="rectangle"
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
          data-ad-format="horizontal"
          data-full-width-responsive="false"
        />
      </div>
    </div>
  );
}