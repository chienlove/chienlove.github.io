// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',   // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',  // Compact/Display 300x250
  mobileSlot2 = '7109430646',  // Multiplex
  desktopMode = 'auto',        // 'auto' (không chèn unit) | 'unit' (chèn 1 unit responsive)
  desktopSlot = '4575220124',  // dùng lại slot responsive nếu cần
}) {
  const mRef = useRef(null);
  const dRef = useRef(null);

  useEffect(() => {
    const push = (el) => {
      if (!el || typeof window === 'undefined') return;
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch {}
    };

    const observe = (el) => {
      if (!el) return;
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              push(el);
              io.unobserve(el);
            }
          });
        }, { rootMargin: '200px' });
        io.observe(el);
        return () => io.disconnect();
      } else {
        push(el);
      }
    };

    observe(mRef.current);
    observe(dRef.current);
  }, []);

  const isCompact = mobileVariant === 'compact';

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile */}
      <div className="block md:hidden w-full">
        {isCompact ? (
          // 300x250 cố định, căn giữa
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
          // Multiplex: KHÔNG giới hạn height, chiếm full bề ngang card, chặn tràn ngang
          <div
  className="w-full overflow-x-hidden overflow-y-visible"
  style={{ maxHeight: 'none', height: 'auto' }}  // chống bị ancestor giới hạn
>
  <ins
    ref={mRef}
    className="adsbygoogle"
    style={{ display: 'block' }}                 // để Google tự tính width/height
    data-ad-client="ca-pub-3905625903416797"
    data-ad-slot={mobileSlot2}
    data-ad-format="autorelaxed"
    data-full-width-responsive="true"
  />
</div>
        )}
      </div>

      {/* Desktop */}
      {desktopMode === 'unit' ? (
        // Nếu muốn chắc chắn có quảng cáo trên desktop => chèn 1 unit responsive
        <div className="hidden md:block w-full">
          <div className="w-full overflow-x-hidden">
            <ins
              ref={dRef}
              className="adsbygoogle"
              style={{ display: 'block', width: '100%', minHeight: 90 }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={desktopSlot}
              data-ad-format="auto"
              data-full-width-responsive="true"
            />
          </div>
        </div>
      ) : (
        // desktopMode === 'auto' -> không chèn unit, để Auto Ads tự phân bổ
        <div className="hidden md:block" />
      )}
    </div>
  );
}