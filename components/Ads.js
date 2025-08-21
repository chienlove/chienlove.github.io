// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',         // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',        // Compact / Display
  mobileSlot2 = '7109430646',        // Multiplex
  desktopSlot = null,                // Nếu null, dùng mobileSlot1
}) {
  const mRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => {
    const attach = (el) => {
      if (!el) return;
      const push = () => {
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch {}
      };
      if (typeof window === 'undefined') return;
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
    };

    attach(mRef.current);
    attach(dRef.current);
  }, []);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // Banner 300x250: cố định kích thước, canh giữa
          <div className="w-full flex justify-center">
            <ins
              ref={mRef}
              className="adsbygoogle"
              style={{ display: 'block', width: 300, height: 250 }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot1}
              data-full-width-responsive="false"
            />
          </div>
        ) : (
          // Multiplex: chiếm full width, không giới hạn height, chặn tràn ngang
          <div className="w-full overflow-x-hidden">
            <ins
              ref={mRef}
              className="adsbygoogle"
              style={{ display: 'block', width: '100%' }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot2}
              data-ad-format="autorelaxed"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop: render 1 unit responsive để không phụ thuộc Auto Ads */}
      <div className="hidden md:block w-full">
        <div className="w-full overflow-x-hidden">
          <ins
            ref={dRef}
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: 90 }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopSlot || mobileSlot1}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
}