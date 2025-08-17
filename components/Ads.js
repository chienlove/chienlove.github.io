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

    const push = () => {
      try {
        if (el.getAttribute('data-adsbygoogle-status') === 'done') return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {}
    };

    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
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
