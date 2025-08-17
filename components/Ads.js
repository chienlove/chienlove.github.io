'use client';
import { useEffect, useRef } from 'react';

export default function AdUnit({
  slot = '5160182988',
  className = '',
  format = 'auto',
  fullWidth = true,
  style,
  label = 'Quảng cáo',
}) {
  const insRef = useRef(null);

  useEffect(() => {
    const el = insRef.current;
    if (!el || typeof window === 'undefined') return;

    let attempts = 0;
    let timer;

    const tryPush = () => {
      try {
        // Nếu <ins> đã render ad rồi thì thôi
        if (el.getAttribute('data-adsbygoogle-status') === 'done') return;

        if (window.adsbygoogle && typeof window.adsbygoogle.push === 'function') {
          window.adsbygoogle.push({});
        } else if (attempts < 40) { // ~10s (40 * 250ms)
          attempts += 1;
          timer = setTimeout(tryPush, 250);
        }
      } catch (_) {
        // nuốt lỗi nhẹ do adblock...
      }
    };

    // Chỉ push khi sắp vào viewport (tiết kiệm)
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              tryPush();
              io.unobserve(el);
            }
          });
        },
        { rootMargin: '200px' }
      );
      io.observe(el);
      return () => {
        io.disconnect();
        clearTimeout(timer);
      };
    } else {
      tryPush();
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className={`my-6 w-full flex flex-col items-center ${className}`}>
      <span className="text-sm text-gray-500 font-semibold mb-1">{label}</span>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={style || { display: 'block' }}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={fullWidth ? 'true' : 'false'}
      />
    </div>
  );
}