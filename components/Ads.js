'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { useRouter } from 'next/router';

function pushAdsense() {
  try {
    const w = window;
    w.adsbygoogle = w.adsbygoogle || [];
    w.adsbygoogle.push({});
  } catch (e) {
  }
}

const AdUnit = ({
  className = '',
  mobileVariant = 'compact',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'auto',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) => {
  const wrapperRef = useRef(null);
  const [layout, setLayout] = useState('unknown');
  const [shouldRender, setShouldRender] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const w = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 0;
      setLayout(w >= 768 ? 'desktop' : 'mobile');
    };

    detect();
    
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 150);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || layout === 'unknown') return;
    const root = wrapperRef.current;
    if (!root) return;

    let observer = null;
    let pushed = false;

    const tryPush = () => {
      if (pushed) return;
      
      const ins = root.querySelector('ins.adsbygoogle');
      if (!ins) return;

      if (ins.offsetWidth > 0) {
        if (ins.getAttribute('data-load-status') === 'done') return;
        if (ins.innerHTML.trim() !== '') return;

        ins.setAttribute('data-load-status', 'done');
        pushAdsense();
        pushed = true;
        if (observer) observer.disconnect();
      }
    };

    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        tryPush();
      });
      observer.observe(root);
    }

    const t = setTimeout(tryPush, 300);

    return () => {
      if (observer) observer.disconnect();
      clearTimeout(t);
    };
  }, [shouldRender, layout, router.asPath, mobileVariant, mobileSlot1, mobileSlot2, desktopMode, desktopSlot, inArticleSlot, isArticleAd]);

  const containerClass = `w-full overflow-hidden text-center my-4 ${className}`;
  const adStyle = { display: 'block', width: '100%', minHeight: '280px' };
  const articleStyle = { display: 'block', textAlign: 'center', width: '100%', minHeight: '280px' };

  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={containerClass} key={router.asPath + '-art'} style={{ minHeight: '280px' }}>
        {shouldRender && (
          <ins
            className="adsbygoogle"
            style={articleStyle}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={inArticleSlot}
            data-ad-format="auto"
            data-full-width-responsive="true" 
          />
        )}
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className={containerClass} key={router.asPath + '-main'} style={{ minHeight: '280px' }}>
      {shouldRender && layout !== 'unknown' && (
        <>
          {layout === 'mobile' && (
            <div className="w-full">
              <ins
                className="adsbygoogle"
                style={adStyle} 
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileVariant === 'compact' ? mobileSlot1 : mobileSlot2}
                data-ad-format="auto" 
                data-full-width-responsive="true"
              />
            </div>
          )}

          {layout === 'desktop' && (
            <div className="w-full">
              <ins
                className="adsbygoogle"
                style={adStyle}
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot2}
                data-ad-format="auto"
                data-full-width-responsive="true" 
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(AdUnit);
