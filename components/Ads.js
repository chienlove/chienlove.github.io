// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Hai ad unit tách biệt:
 * - Mobile: 300x250 (luôn hiển thị ở màn hình nhỏ)
 * - Desktop: Ưu tiên 728x90 (fixed). Nếu sau ~1.5s không fill, đẩy Fallback responsive.
 *
 * Yêu cầu:
 * - Loader AdSense đặt ở pages/_document.js (thẻ <script> thường trong <Head>)
 * - Truyền đúng 2 slot: mobileSlot (300x250) & desktopSlot (728x90)
 */
export default function AdUnit({
  mobileSlot = '5160182988',   // slot 300x250
  desktopSlot = '4575220124',  // slot 728x90
  className = '',
  label = 'Quảng cáo',
}) {
  // Mobile
  const mobileRef = useRef(null);

  // Desktop
  const desktopFixedRef = useRef(null);
  const desktopFallbackRef = useRef(null);

  useEffect(() => {
    const canPush = () =>
      typeof window !== 'undefined' &&
      window.adsbygoogle &&
      typeof window.adsbygoogle.push === 'function';

    const pushOnce = (el) => {
      if (!el) return;
      try {
        if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
        if (canPush()) {
          window.adsbygoogle.push({});
        }
      } catch (_) {
        /* nuốt lỗi nhẹ (adblock, v.v.) */
      }
    };

    const tryPushWithRetry = (el, maxAttempts = 40, delay = 250) => {
      if (!el) return;
      let attempts = 0;
      const tick = () => {
        try {
          if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
          if (canPush()) {
            window.adsbygoogle.push({});
          } else if (attempts < maxAttempts) {
            attempts += 1;
            setTimeout(tick, delay);
          }
        } catch (_) {
          /* ignore */
        }
      };
      tick();
    };

    const observeMobile = () => {
      const el = mobileRef.current;
      if (!el) return;
      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
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

    const observeDesktop = () => {
      const fixedEl = desktopFixedRef.current;
      const fbEl = desktopFallbackRef.current;

      if (!fixedEl) return;

      const onIntersect = () => {
        // 1) Đẩy block 728x90 trước
        tryPushWithRetry(fixedEl);

        // 2) Sau ~1.5s, nếu 728x90 chưa fill (chưa có status=done) => đẩy fallback responsive
        setTimeout(() => {
          const filled = fixedEl.getAttribute('data-adsbygoogle-status') === 'done';
          if (!filled && fbEl) {
            tryPushWithRetry(fbEl);
          }
        }, 1500);
      };

      if ('IntersectionObserver' in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                onIntersect();
                io.unobserve(fixedEl);
              }
            });
          },
          { rootMargin: '200px' }
        );
        io.observe(fixedEl);
        return () => io.disconnect();
      } else {
        onIntersect();
        return () => {};
      }
    };

    const unMobile = observeMobile();
    const unDesktop = observeDesktop();

    return () => {
      unMobile && unMobile();
      unDesktop && unDesktop();
    };
  }, []);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-1">{label}</span>

      {/* Mobile: 300x250 (chỉ hiện trên mobile) */}
      <div className="block md:hidden w-full">
        <ins
          ref={mobileRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '300px',
            height: '250px',
            margin: '0 auto',
            minHeight: '250px', // giữ chỗ, tránh CLS
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot}
          data-full-width-responsive="false"
        />
      </div>

      {/* Desktop: Ưu tiên 728x90 (fixed). Nếu không fill, dùng fallback responsive */}
      <div className="hidden md:block w-full" style={{ maxWidth: 1000 }}>
        {/* Fixed 728x90 */}
        <ins
          ref={desktopFixedRef}
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
          data-full-width-responsive="false"
        />

        {/* Fallback responsive (auto) – chỉ đẩy nếu fixed không fill */}
        <ins
          ref={desktopFallbackRef}
          className="adsbygoogle"
          style={{
            display: 'block',
            margin: '1rem auto 0',
            // không set width/height cố định để Google tự co giãn
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot}   // có thể dùng slot responsive riêng nếu bạn tạo
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}