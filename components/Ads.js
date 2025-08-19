// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Mobile:
 *  - mobileVariant="compact"   -> 300x250 (mobileSlot1)
 *  - mobileVariant="multiplex" -> Multiplex (autorelaxed) (mobileSlot2)
 *
 * Desktop:
 *  - KHÔNG render banner thủ công (nhường hoàn toàn cho Auto Ads).
 */
export default function AdUnit({
  mobileSlot1 = '5160182988',   // 300x250
  mobileSlot2 = '7109430646',   // Multiplex
  mobileVariant = 'compact',     // 'compact' | 'multiplex'
  label = 'Quảng cáo',
  className = '',
}) {
  const mRef = useRef(null);

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
    return () => { unM && unM(); };
  }, []);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-2">{label}</span>

      {/* Mobile only */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // 300×250 cố định
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
          // Multiplex: full width theo card chứa, không ép kích thước cố định
          <div
            className="mx-auto"
            style={{
              width: '100%',
              maxWidth: '100%',    // không vượt quá bề ngang card
            }}
          >
            <ins
              ref={mRef}
              className="adsbygoogle"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                margin: '0 auto',
                minHeight: '620px', // giữ chỗ giảm layout shift
              }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2}
              data-ad-format="autorelaxed"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop: KHÔNG render gì ở đây -- để Auto Ads quyết định */}
      <div className="hidden md:block w-full" />
    </div>
  );
}