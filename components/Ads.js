// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
}) {
  const mRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => {
    const push = () => {
      try {
        if (typeof window !== 'undefined') {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch {}
    };

    [mRef, dRef].forEach((ref) => {
      const el = ref.current;
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
    });
  }, []);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`w-full ${className}`}>
      {/* MOBILE */}
      <div className="block md:hidden w-full">
        {isCompact ? (
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
          <ins
            ref={mRef}
            className="adsbygoogle"
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '100%',
              margin: '0 auto',
              minHeight: 600,
              maxHeight: 800,
              boxSizing: 'border-box',
            }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2}
            data-ad-format="autorelaxed"
            data-full-width-responsive="true"
          />
        )}
      </div>

      {/* DESKTOP: Để Google tự chèn quảng cáo */}
      <div className="hidden md:block w-full">
        <ins
          ref={dRef}
          className="adsbygoogle"
          style={{ display: 'block' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}
