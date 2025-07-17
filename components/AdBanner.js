import Script from 'next/script';

export default function AdBanner() {
  return (
    <div className="my-6 min-h-[90px] w-full">
      <Script 
        strategy="afterInteractive"
        src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
        crossOrigin="anonymous"
      />
      <ins
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-3905625903416797"
        data-ad-slot="5160182988"
        data-ad-format="auto"
        data-full-width-responsive="true"
      ></ins>
      <Script strategy="afterInteractive" id="adsbygoogle-init">
        {`(adsbygoogle = window.adsbygoogle || []).push({});`}
      </Script>
    </div>
  );
}