// components/Ads.js
'use client';

import { useEffect, useRef } from 'react';

// Hàm helper để gọi window.adsbygoogle.push({})
// Đặt riêng để dễ bảo trì và sử dụng.
function pushAdsense() {
  try {
    const w = window;
    if (w.adsbygoogle && w.adsbygoogle.push) {
      w.adsbygoogle.push({});
    }
  } catch (e) {
    console.error('Adsense push error (global):', e);
  }
}

export default function AdUnit({
  className = '',
  mobileVariant = 'compact',        // 'compact' | 'multiplex'
  mobileSlot1 = '5160182988',       // 300x250
  mobileSlot2 = '7109430646',       // "multiplex" nhưng ta render dạng auto
  desktopMode = 'auto',             // 'auto' | 'unit'
  desktopSlot = '4575220124',

  // In-article
  inArticleSlot = '4276741180',
  isArticleAd = false,
}) {
  const wrapperRef = useRef(null);

  useEffect(() => {
    const root = wrapperRef.current;
    if (!root) return;

    let disposed = false; // Biến cờ để kiểm soát việc unmount
    let observer = null;

    const pushIfNeeded = () => {
      if (disposed) return; // Không làm gì nếu component đã bị hủy
      if (typeof window === 'undefined') return;

      const list = Array.from(root.querySelectorAll('ins.adsbygoogle'));
      if (!list.length) return;

      // 1. Chỉ xử lý các ins đang thực sự hiển thị và chưa load
      const visible = list.filter(
        // offsetParent !== null: Đảm bảo phần tử không bị display: none
        (ins) => ins.offsetParent !== null && ins.dataset.adLoaded !== '1'
      );
      
      if (!visible.length) return;

      // 2. Sửa lỗi triệt để cho "No slot size for availableWidth=0"
      // Phải có width VÀ height > 0 cho responsive ads.
      const ready = visible.filter((ins) => {
        const rect = ins.getBoundingClientRect?.();
        // Kiểm tra width VÀ height phải lớn hơn 0
        return rect && rect.width > 0 && rect.height > 0;
      });
      
      if (!ready.length) return; // KHÔNG push nếu chưa có kích thước hợp lệ

      // 3. Tiến hành push (chỉ các phần tử đã sẵn sàng)
      ready.forEach(ins => {
        // Đánh dấu là đã được push để tránh lỗi "already have ads in them"
        ins.dataset.adLoaded = '1';
      });
      
      // Push chung: AdSense script sẽ tự tìm các phần tử `ins` mới được đánh dấu
      pushAdsense();
    };

    // --- Khởi tạo và Cleanup ---
    
    // Sử dụng ResizeObserver để theo dõi khi kích thước thay đổi (từ 0 lên > 0)
    // Đây là fix triệt để cho lỗi availableWidth=0 trong các component ẩn/hiện.
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      observer = new ResizeObserver(() => {
        pushIfNeeded(); // Gọi lại khi kích thước thay đổi
      });
      
      // Theo dõi tất cả các ins elements
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach(ins => observer.observe(ins));
    }

    // Luôn chạy lần đầu tiên sau khi component mount
    pushIfNeeded();
    
    // Cleanup function: Rất quan trọng trong React/Next.js
    return () => {
      disposed = true; // Ngăn chặn lệnh push bị trì hoãn
      if (observer) {
        observer.disconnect(); // Ngừng theo dõi
      }
      
      // Tùy chọn: Xóa data-ad-loaded khi component unmount
      // Giúp đảm bảo ad có thể load lại nếu component bị unmount/mount lại nhanh
      const insElements = root.querySelectorAll('ins.adsbygoogle');
      insElements.forEach(ins => {
         delete ins.dataset.adLoaded;
      });
    };
  }, [
    // Dependency list giữ nguyên
    mobileVariant,
    mobileSlot1,
    mobileSlot2,
    desktopMode,
    desktopSlot,
    inArticleSlot,
    isArticleAd,
  ]);
  
  // --- JSX Rendering (Giữ nguyên cấu trúc) ---
  
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

  return (
    <div ref={wrapperRef} className={`w-full ${className}`}>
      {/* Mobile */}
      <div className="block md:hidden w-full">
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
