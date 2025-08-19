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
  className = '',
  mobileVariant = 'compact',      // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',     // 300x250
  mobileSlot2 = '7109430646',     // Multiplex
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

    const el = mRef.current;
    if (!el) return;

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
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
      {/* Mobile only */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // 300×250: cố định, căn giữa -- KHÔNG tràn
          <ins
            ref={mRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: 300,
              height: 250,
              margin: '0 auto',
              minHeight: 250,
              boxSizing: 'border-box',
            }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot1}
            data-full-width-responsive="false"
          />
        ) : (
          // Multiplex: ép bên trong card luôn fit 100% bề ngang (không cắt)
          <div className="ad-fit">
            <ins
              ref={mRef}
              className="adsbygoogle"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '100%',
                margin: 0,
                minHeight: 660, // 600–800 tùy creative
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

      {/* Desktop: KHÔNG render gì -- Auto Ads sẽ tự quyết */}
      <div className="hidden md:block w-full" />

      <style jsx>{`
        /* Bọc Multiplex để mọi phần tử bên trong không vượt quá bề ngang card */
        .ad-fit {
          width: 100%;
        }
        /* Ép chính iframe của AdSense co theo card */
        .ad-fit :global(iframe) {
          width: 100% !important;
          max-width: 100% !important;
          height: auto;
        }
        /* Một số creative dùng div/img bên trong -- phòng trường hợp tràn */
        .ad-fit :global(img),
        .ad-fit :global(video),
        .ad-fit :global(div) {
          max-width: 100% !important;
        }
      `}</style>
    </div>
  );
}