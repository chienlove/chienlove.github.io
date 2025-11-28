// components/Ads.js
'use client';

import { useEffect, useRef, useState } from 'react';

// Hàm helper để gọi window.adsbygoogle.push({})
function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    const msg = e && typeof e.message === 'string' ? e.message : '';

    // 1) Bỏ qua lỗi "No slot size for availableWidth=0"
    if (msg.includes('No slot size for availableWidth=0')) {
      return;
    }

    // 2) Bỏ qua lỗi khi tất cả ins.adsbygoogle đã có quảng cáo
    if (msg.includes("All 'ins' elements in the DOM with class=adsbygoogle already have ads in them.")) {
      return;
    }

    console.error('Adsense push error (global):', e ? e : 'Unknown AdSense push error');
  }
}

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

  // layout: 'unknown' | 'mobile' | 'desktop'
  const [layout, setLayout] = useState('unknown');

  // Flag: đảm bảo chỉ push ads MỘT LẦN cho mỗi AdUnit
  const hasPushedRef = useRef(false);

  // Xác định layout theo window.innerWidth (chỉ chạy trên client)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const detect = () => {
      const w =
        window.innerWidth ||
        document.documentElement.clientWidth ||
        document.body.clientWidth ||
        0;

      if (desktopMode === 'unit' && w >= 768) {
        setLayout('desktop');
      } else {
        setLayout('mobile');
      }
    };

    detect();

    // Nếu bạn muốn khi resize thay đổi ad, có thể bật lại:
    // window.addEventListener('resize', detect);
    // return () => window.removeEventListener('resize', detect);
  }, [desktopMode]);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    let disposed = false;
    let observer = null;

    const pushIfNeeded = () => {
      if (disposed) return;
      if (typeof window === 'undefined') return;
      if (hasPushedRef.current) return; // 🔒 ĐÃ push rồi thì không push lại nữa

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      // Chỉ xử lý các ins đang hiển thị, chưa được load
      // và chưa có data-adsbygoogle-status="done" (AdSense đã render xong)
      const visible = list.filter((ins) => {
        const status = ins.getAttribute('data-adsbygoogle-status');
        return (
          ins.offsetParent !== null &&
          ins.dataset.adLoaded !== '1' &&
          status !== 'done'
        );
      });

      if (!visible.length) return;

      // Kiểm tra kích thước, tránh availableWidth = 0
      const ready = visible.filter((ins) => {
        if (!ins.getBoundingClientRect) return false;
        const rect = ins.getBoundingClientRect();
        // Chỉ cần width > 0 là đủ, height AdSense tự tính
        return rect.width > 0;
      });

      if (!ready.length) return;

      // Đánh dấu đã load, tránh push lặp cho cùng 1 thẻ
      ready.forEach((ins) => {
        ins.dataset.adLoaded = '1';
      });

      // 🔒 Đánh dấu đã push quảng cáo cho wrapper này
      hasPushedRef.current = true;

      // Push global (AdSense sẽ pick thẻ tiếp theo trong hàng đợi)
      pushAdsense();
    };

    // Theo dõi thay đổi kích thước của ins
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        pushIfNeeded();
      });

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => observer.observe(ins));
    }

    // Push lần đầu
    pushIfNeeded();

    return () => {
      disposed = true;
      if (observer) observer.disconnect();

      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach((ins) => {
        // Chỉ xóa cờ nội bộ nếu cần, KHÔNG đụng tới data-adsbygoogle-status
        delete ins.dataset.adLoaded;
      });

      // Khi unmount, mở khoá để nếu component mount lần nữa thì push lại được
      hasPushedRef.current = false;
    };
  }, [
    mobileVariant,
    mobileSlot1,
    mobileSlot2,
    desktopMode,
    desktopSlot,
    inArticleSlot,
    isArticleAd,
    layout, // khi layout đổi (mobile/desktop) thì chạy lại
  ]);

  // ======================= JSX Rendering =======================

  // Quảng cáo in-article: luôn là 1 ins duy nhất
  if (isArticleAd) {
    return (
      <div ref={wrapperRef} className={`w-full ${className}`}>
        <ins
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

  // Chưa biết layout (SSR vừa mount, chưa đo xong width) → render container rỗng để tránh push sớm
  if (layout === 'unknown') {
    return <div ref={wrapperRef} className={`w-full ${className}`} />;
  }

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {/* MOBILE ONLY */}
      {layout === 'mobile' && (
        <div className="w-full">
          {mobileVariant === 'compact' ? (
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
                data-ad-format="auto"
                data-full-width-responsive="true"
              />
            </div>
          )}
        </div>
      )}

      {/* DESKTOP ONLY */}
      {layout === 'desktop' && desktopMode === 'unit' && (
        <div className="w-full">
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

      {/* Nếu desktopMode === 'auto' thì layout='desktop' cũng dùng luôn biến thể mobile responsive */}
      {layout === 'desktop' && desktopMode === 'auto' && (
        <div className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block' }}
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