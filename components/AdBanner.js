import { useEffect } from 'react';

export default function AdBanner() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, []);

  return (
    <div className="min-h-[90px] md:min-h-[250px]">
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot="5160182988"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
    </div>
  );
}