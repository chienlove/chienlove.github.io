'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';

function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    const msg = e && typeof e.message === 'string' ? e.message : '';

    if (msg.includes('No slot size for availableWidth=0')) {
      return;
    }

    if (msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them.")) {
      return;
    }

    console.error('Adsense push error (global):', e ? e : 'Unknown AdSense push error');
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'auto',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);
  const [layout, setLayout] = useState('unknown');
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
      if (desktopMode === 'unit' && w >= 768) {
        setLayout('desktop');
      } else {
        setLayout('mobile');
      }
    };

    detect();
    
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, [desktopMode]);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    let disposed = false;
    let observer = null;

    const pushIfNeeded = () => {
      if (disposed) return;
      if (typeof window === 'undefined') return;

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      const visible = list.filter((ins) => {
        const status = ins.getAttribute('data-adsbygoogle-status');
        return (
          ins.offsetParent !== null &&
          ins.dataset.adLoaded !== '1' &&
          status !== 'done'
        );
      });

      if (!visible.length) return;

      const ready = visible.filter((ins) => {
        if (!ins.getBoundingClientRect) return false;
        const rect = ins.getBoundingClientRect();
        return rect.width > 0;
      });

      if (!ready.length) return;

      ready.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });

      pushAdsense();
    };

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        pushIfNeeded();
      });
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    pushIfNeeded();

    return () => {
      disposed = true;
      if (observer) observer.disconnect();
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => {
        delete ins.dataset.adLoaded;
      });
    };
  }, [mobileVariant, mobileSlot1, mobileSlot2, desktopMode, desktopSlot, inArticleSlot, isArticleAd, layout, router.asPath]);

  const containerClass = `w-full overflow-hidden ${className}`;

  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={containerClass} key={router.asPath}>
        <ins
          className="adsbygoogle"
          style={{ display: 'block', textAlign: 'center', width: '100%' }}
          data-ad-client="ca-pub-3905625903416797"
          data-ad-slot={inArticleSlot}
          data-ad-format="auto"
          data-full-width-responsive="false" 
        />
      </div>
    );
  }

  if (layout === 'unknown') {
    return <div ref={wrapperRef} className={containerClass} key={router.asPath} />;
  }

  return (
    <div ref={wrapperRef} className={containerClass} key={router.asPath}>
      {layout === 'mobile' && (
        <div className="w-full">
          {mobileVariant === 'compact' ? (
            <div className="w-full flex justify-center">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%' }} 
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileSlot1}
                data-ad-format="auto" 
                data-full-width-responsive="false"
              />
            </div>
          ) : (
            <div className="w-full">
              <ins
                className="adsbygoogle"
                style={{ display: 'block', width: '100%' }}
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileSlot2}
                data-ad-format="auto"
                data-full-width-responsive="false"
              />
            </div>
          )}
        </div>
      )}

      {layout === 'desktop' && desktopMode === 'unit' && (
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={desktopSlot}
            data-ad-format="auto"
            data-full-width-responsive="true" 
          />
        </div>
      )}

      {layout === 'desktop' && desktopMode === 'auto' && (
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%' }}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={mobileSlot2}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      )}
    </div>
  );
}
