// components/Ads.js
import { useEffect, useRef } from 'react';

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',   // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',  // 300x250
  mobileSlot2 = '7109430646',  // multiplex / autorelaxed
  desktopMode = 'auto',        // 'auto' | 'unit'
  desktopSlot = '4575220124',

  // In-article
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const adRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const el = adRef.current;
    if (!el) return;

    // Tránh push nhiều lần cho cùng 1 <ins>
    if (el.dataset.adLoaded === '1') return;

    let cancelled = false;
    let tries = 0;

    const pushAd = () => {
      if (cancelled) return false;
      try {
        // Luôn đảm bảo adsbygoogle là array trước khi push
        window.adsbygoogle = window.adsbygoogle || [];
        window.adsbygoogle.push({});
        el.dataset.adLoaded = '1';
        return true;
      } catch (e) {
        // Thường gặp khi push quá sớm / bị chặn bởi content-blocker
        console.error('Ad push error:', e);
        return false;
      }
    };

    const tryPushWithRetry = () => {
      if (cancelled) return;
      const ok = pushAd();
      if (ok) return;

      tries += 1;
      // Retry vài lần để chờ script adsense load xong
      if (tries <= 5) setTimeout(tryPushWithRetry, 600);
    };

    // Lazy-load khi sắp xuất hiện
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            tryPushWithRetry();
            observer.unobserve(entry.target);
          });
        },
        { rootMargin: '250px' }
      );

      observer.observe(el);
      return () => {
        cancelled = true;
        try { observer.unobserve(el); } catch {}
        try { observer.disconnect(); } catch {}
      };
    }

    // Fallback
    tryPushWithRetry();
    return () => { cancelled = true; };
  }, []);

  const isCompact = mobileVariant === 'compact';

  // In-article
  if (isArticleAd) {
    return (
      <div className={`w-full ${className}`}>
        <ins
          ref={adRef}
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Mobile */}
      <div className="md:hidden w-full">
        {isCompact ? (
          <div className="w-full flex justify-center">
            <ins
              ref={adRef}
              className="adsbygoogle"
              style={{ display: 'inline-block', width: 300, height: 250 }}
              data-ad-client="ca-pub-3905625903416797"
              data-ad-slot={mobileSlot1}
            />
          </div>
        ) : (
          <div className="w-full">
            <ins
              ref={adRef}
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
            ref={adRef}
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