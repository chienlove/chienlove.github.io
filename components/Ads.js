// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',      // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',     // 300x250
  mobileSlot2 = '7109430646',     // multiplex / autorelaxed
  desktopMode = 'auto',           // 'auto' | 'unit'
  desktopSlot = '4575220124',

  // In-article
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Đảm bảo mảng tồn tại (không push ngay)
    window.adsbygoogle = window.adsbygoogle || [];

    const root = wrapperRef.current;
    if (!root) return;

    const tryPush = (el) => {
      // Đã load/đã filled thì bỏ qua
      if (!el || el.dataset.adLoaded === '1') return true;
      if (el.getAttribute('data-ad-status') === 'filled') {
        el.dataset.adLoaded = '1';
        return true;
      }
      if (Array.isArray(window.adsbygoogle)) {
        try {
          window.adsbygoogle.push({});
          el.dataset.adLoaded = '1';
          return true;
        } catch {
          // SDK có thể chưa sẵn sàng → sẽ retry
        }
      }
      return false;
    };

    const pending = new WeakMap();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const el = entry.target;

          if (el.dataset.adLoaded === '1' || el.getAttribute('data-ad-status') === 'filled') {
            io.unobserve(el);
            continue;
          }

          if (tryPush(el)) {
            io.unobserve(el);
            continue;
          }

          // Retry ngắn khi SDK chưa sẵn sàng
          if (!pending.has(el)) {
            let tries = 0;
            const maxTries = 20; // ~10s với interval 500ms
            const timer = setInterval(() => {
              tries += 1;
              if (tryPush(el) || tries >= maxTries) {
                clearInterval(timer);
                pending.delete(el);
                if (el.dataset.adLoaded === '1') io.unobserve(el);
              }
            }, 500);
            pending.set(el, timer);
          }
        }
      },
      { rootMargin: '200px' }
    );

    const insList = root.querySelectorAll('ins.adsbygoogle');
    insList.forEach((el) => {
      if (el.getAttribute('data-ad-status') === 'filled') {
        el.dataset.adLoaded = '1';
        return;
      }
      io.observe(el);
    });

    return () => {
      try { io.disconnect(); } catch {}
      insList.forEach((el) => {
        const t = pending.get(el);
        if (t) clearInterval(t);
      });
    };
  }, []);

  const isCompact = mobileVariant === 'compact';

  // In-article
  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={`w-full ${className} flex justify-center py-2`}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="fluid"
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
              style={{ display: 'block', width: 300, height: 250 }}
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
              data-ad-format="autorelaxed"
              data-full-width-responsive="true"
            />
          </div>
        )}
      </div>

      {/* Desktop (khi muốn render unit thủ công) */}
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