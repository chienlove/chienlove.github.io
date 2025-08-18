// components/Ads.js
'use client';
import { useEffect, useRef } from 'react';

/**
 * Mobile:
 *   - Hiển thị HAI ad unit cố định:
 *     1) 300x250  -> mobileSlot1
 *     2) 336x280  -> mobileSlot2
 *
 * Desktop:
 *   - KHÔNG render ad thủ công. Nhường cho Auto Ads (đặt trong pages/_document.js).
 *   - Tùy chọn: enableDesktopFallback=true để thêm 1 block responsive dự phòng.
 *
 * Yêu cầu:
 * - Script AdSense đã nằm trong <Head> (_document.js) và bạn đã bật Auto Ads trong AdSense.
 */
export default function AdUnit({
  mobileSlot1 = '5160182988', // ví dụ: 5160182988
  mobileSlot2 = '7109430646', // tạo thêm slot 336x280 trong AdSense
  label = 'Quảng cáo',
  className = '',
  // Fallback tùy chọn cho desktop (mặc định tắt để tránh "đụng" Auto Ads)
  enableDesktopFallback = false,
  desktopFallbackSlot = 'YOUR_RESPONSIVE_SLOT_ID', // nếu bật fallback, dùng slot responsive
}) {
  const mRef1 = useRef(null);
  const mRef2 = useRef(null);
  const dFbRef = useRef(null);

  useEffect(() => {
    const canPush = () =>
      typeof window !== 'undefined' &&
      window.adsbygoogle &&
      typeof window.adsbygoogle.push === 'function';

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
          /* ignore minor errors */
        }
      };
      tick();
    };

    const observe = (el) => {
      if (!el) return () => {};
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

    const un1 = observe(mRef1.current);
    const un2 = observe(mRef2.current);
    const unD = enableDesktopFallback ? observe(dFbRef.current) : () => {};

    return () => {
      un1 && un1();
      un2 && un2();
      unD && unD();
    };
  }, [enableDesktopFallback]);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-2">{label}</span>

      {/* ===== Mobile only: HAI block cố định ===== */}
      {/* 1) 300x250 */}
      <div className="block md:hidden w-full mb-3">
        <ins
          ref={mRef1}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '300px',
            height: '250px',
            margin: '0 auto',
            minHeight: '250px', // giữ chỗ, chống CLS
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot1}
          data-full-width-responsive="false"
        />
      </div>

      {/* 2) 336x280 */}
      <div className="block md:hidden w-full">
        <ins
          ref={mRef2}
          className="adsbygoogle"
          style={{
            display: 'block',
            width: '336px',
            height: '280px',
            margin: '0 auto',
            minHeight: '280px',
          }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={mobileSlot2}
          data-full-width-responsive="false"
        />
      </div>

      {/* ===== Desktop: KHÔNG render thủ công – nhường Auto Ads ===== */}
      {/* (Tuỳ chọn) Fallback responsive cho desktop nếu muốn thêm 1 vị trí cố định */}
      {enableDesktopFallback && (
        <div className="hidden md:block w-full" style={{ maxWidth: 1100 }}>
          <ins
            ref={dFbRef}
            className="adsbygoogle"
            style={{ display: 'block', margin: '0.5rem auto 0' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopFallbackSlot}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}