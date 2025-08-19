// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Mobile:
 *  - mobileVariant="compact"   -> 300x250 (mobileSlot1, cố định, không tràn)
 *  - mobileVariant="multiplex" -> Multiplex (autorelaxed) (mobileSlot2), ép fit card
 *
 * Desktop:
 *  - KHÔNG render banner thủ công (nhường hoàn toàn cho Auto Ads).
 */
export default function AdUnit({
  className = '',
  mobileVariant = 'compact', // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  label = 'Quảng cáo',
}) {
  const mRef = useRef(null);

  useEffect(() => {
    const push = () => {
      try {
        if (typeof window !== 'undefined') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch {}
    };

    // IntersectionObserver: chỉ push khi vào viewport
    const el = mRef.current;
    if (!el) return;
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        entries => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              push();
              io.unobserve(el);
            }
          });
        },
        { rootMargin: '200px' }
      );
      io.observe(el);
      return () => io.disconnect();
    } else {
      push();
    }
  }, []);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`w-full ${className}`}>
      <span className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-2 block">
        {label}
      </span>

      {/* Mobile only */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // 300×250 cố định -> không tràn, căn giữa
          <ins
            ref={mRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: 300,
              height: 250,
              margin: '0 auto',
              minHeight: 250, // chống CLS
              boxSizing: 'border-box',
            }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot1}
            data-full-width-responsive="false"
          />
        ) : (
          // Multiplex: ép fit card nhờ clipper + ép iframe 100%
          <div className="ad-clip">
            <ins
              ref={mRef}
              className="adsbygoogle"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                margin: 0,
                minHeight: 660, // 600–800 tuỳ creative
                boxSizing: 'border-box',
              }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2}
              data-ad-format="autorelaxed"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop: KHÔNG render gì – Auto Ads sẽ tự quyết */}
      <div className="hidden md:block w-full" />

      <style jsx>{`
        /* Clipper bám đúng card: bo góc + cắt mọi phần thò ra */
        .ad-clip {
          width: 100%;
          overflow: hidden;
          border-radius: inherit;
        }
        /* Ép mọi iframe AdSense bên trong không vượt quá bề ngang card */
        .ad-clip :global(iframe) {
          width: 100% !important;
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );
}