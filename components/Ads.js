'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

const AdUnit = ({
  className = '',
  mobileVariant = 'auto',
  mobileSlot1 = '5160182988',
  mobileSlot2 = '7109430646',
  desktopMode = 'unit',
  desktopSlot = '4575220124',
  inArticleSlot = '4276741180',
  isArticleAd = false,
  isMultiplex = false,
}) => {
  const containerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    // Chỉ chạy trên client và khi container đã sẵn sàng
    if (typeof window === 'undefined' || !containerRef.current) return;

    // 1. XÓA SẠCH NỘI DUNG CŨ: Đảm bảo không bị trùng lặp DOM khi chuyển trang
    containerRef.current.innerHTML = '';

    // 2. TẠO THẺ <ins> BẰNG JS THUẦN: Cách ly hoàn toàn khỏi sự dòm ngó của React
    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.setAttribute('data-ad-client', 'ca-pub-3905625903416797');

    if (isArticleAd) {
      ins.style.display = 'block';
      ins.style.textAlign = 'center';
      ins.setAttribute('data-ad-layout', 'in-article');
      ins.setAttribute('data-ad-format', 'fluid');
      ins.setAttribute('data-ad-slot', inArticleSlot);
    } else if (isMultiplex) {
      ins.style.display = 'block';
      ins.setAttribute('data-ad-format', 'autorelaxed');
      ins.setAttribute('data-ad-slot', mobileSlot2);
    } else {
      // 3. GIẢI QUYẾT CTR CAO & QUẢNG CÁO QUÁ TO:
      ins.style.display = 'block';
      ins.style.margin = '0 auto';
      ins.style.width = '100%';
      ins.style.maxHeight = '100px'; // KHÓA CỨNG chiều cao tối đa (tránh qc hình vuông/chữ nhật lớn)
      
      // Ép Google chỉ hiển thị quảng cáo ngang (banner)
      ins.setAttribute('data-ad-format', 'horizontal'); 
      // Tắt tính năng tự động tràn viền màn hình di động của Google
      ins.setAttribute('data-full-width-responsive', 'false'); 
      ins.setAttribute('data-ad-slot', desktopMode === 'unit' ? desktopSlot : mobileSlot1);
    }

    // Gắn thẻ <ins> vào DOM
    containerRef.current.appendChild(ins);

    // Kích hoạt AdSense
    try {
      const w = window;
      w.adsbygoogle = w.adsbygoogle || [];
      w.adsbygoogle.push({});
    } catch (e) {
      console.error('AdSense push error:', e);
    }

  }, [router.asPath, isArticleAd, isMultiplex, desktopMode]); 
  // Dependency array chỉ theo dõi router, không bị ảnh hưởng bởi các state khác trong file index.js

  return (
    // React chỉ nhìn thấy một thẻ div trống rỗng và sẽ để yên cho nó
    <div 
      ref={containerRef} 
      className={`w-full overflow-hidden text-center min-h-[90px] flex justify-center items-center ${className}`} 
    />
  );
};

export default AdUnit;
