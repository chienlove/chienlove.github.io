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
    
    // Tăng nhẹ thời gian chờ để layout ổn định trước khi render ads
    const timer = setTimeout(() => {
      setShouldRender(true);
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!shouldRender || layout === 'unknown') return;
    const root = wrapperRef.current;
    if (!root) return;

    // Reset previous ads if content changed drastically (optional safety)
    const ins = root.querySelector('ins.adsbygoogle');
    if (ins && ins.getAttribute('data-load-status') === 'done') return;

    let observer = null;
    let pushed = false;

    const tryPush = () => {
      if (pushed) return;
      const insNode = root.querySelector('ins.adsbygoogle');
      if (!insNode) return;

      // Đảm bảo container đã có width thì mới push ad
      if (insNode.offsetWidth > 0) {
        if (insNode.innerHTML.trim() !== '') return;

        insNode.setAttribute('data-load-status', 'done');
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

    const t = setTimeout(tryPush, 500);

    return () => {
      if (observer) observer.disconnect();
      clearTimeout(t);
    };
  }, [shouldRender, layout, router.asPath]);

  // Style container: flex center để quảng cáo luôn nằm giữa
  const containerClass = `w-full flex justify-center items-center my-4 overflow-hidden ${className}`;
  
  // Style cho thẻ ins: quan trọng display block
  const adStyle = {
    display: 'block',
    width: '100%',
    textAlign: 'center'
  };

  const articleStyle = {
    display: 'block',
    textAlign: 'center',
    width: '100%'
  };

  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={containerClass} key={router.asPath + '-art'} style={{ minHeight: '280px' }}>
        {shouldRender && (
          <ins
            className="adsbygoogle"
            style={articleStyle}
            data-ad-client="ca-pub-3905625903416797"
            data-ad-slot={inArticleSlot}
            data-ad-format="fluid"
            data-ad-layout="in-article"
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
            <div className="w-full flex justify-center" style={{ maxWidth: '100%' }}>
              <ins
                className="adsbygoogle"
                style={adStyle}
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={mobileVariant === 'compact' ? mobileSlot1 : mobileSlot2}
                // QUAN TRỌNG: Đổi 'auto' thành 'rectangle, horizontal'
                // Lý do: 'auto' trên mobile sẽ cố gắng tràn viền (gây lệch).
                // 'rectangle' sẽ ép quảng cáo thành hình khối nằm gọn trong card.
                data-ad-format="rectangle, horizontal" 
                
                // QUAN TRỌNG: Bật lại true để đảm bảo logic responsive của Google hoạt động -> Có quảng cáo
                data-full-width-responsive="true"
              />
            </div>
          )}

          {layout === 'desktop' && (
            <div className="w-full flex justify-center">
              <ins
                className="adsbygoogle"
                style={adStyle}
                data-ad-client="ca-pub-3905625903416797"
                data-ad-slot={desktopMode === 'unit' ? desktopSlot : mobileSlot2}
                data-ad-format="auto" // Desktop màn hình rộng, để auto thường an toàn hơn
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
