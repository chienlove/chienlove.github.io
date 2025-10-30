// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250
  mobileSlot2 = '7109430646',       // multiplex / autorelaxed
  desktopMode = 'auto',             // 'auto' | 'unit' (render khối desktop riêng)
  desktopSlot = '4575220124',

  // In-article
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    // Tìm tất cả ins.adsbygoogle trong component này
    const insList = Array.from(root.querySelectorAll('ins.adsbygoogle'));
    if (insList.length === 0) return;

    // Init safe
    // eslint-disable-next-line no-unsafe-optional-chaining
    if (typeof window !== 'undefined') {
      // Bảo đảm mảng tồn tại, nhưng KHÔNG push ngay để tránh lỗi khi SDK chưa load
      window.adsbygoogle = window.adsbygoogle || [];
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;

          const el = entry.target;
          // Chặn double-push
          if (el.dataset.adLoaded === '1') {
            io.unobserve(el);
            continue;
          }

          try {
            // Nếu SDK có sẵn thì push, nếu chưa có thì thử lại ở lần intersect sau
            if (window?.adsbygoogle && Array.isArray(window.adsbygoogle)) {
              window.adsbygoogle.push({});
              el.dataset.adLoaded = '1';
              io.unobserve(el);
            }
          } catch (e) {
            // Không crash app; để IO tiếp tục theo dõi cho lần sau
            console.warn('ads: push failed (safe-ignored)', e);
          }
        }
      },
      { rootMargin: '200px' }
    );

    insList.forEach((el) => {
      // Nếu đã được fill bởi Google (đã có data-ad-status hoặc đã đánh dấu), bỏ qua
      if (el.dataset.adLoaded === '1' || el.getAttribute('data-ad-status') === 'filled') return;
      io.observe(el);
    });

    return () => {
      try { io.disconnect(); } catch {}
    };
  }, []);

  const isCompact = mobileVariant === 'compact';

  // In-article riêng
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
              style={{ display: 'block', width: '300px', height: '250px' }}
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

      {/* Desktop */}
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