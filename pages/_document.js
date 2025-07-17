// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        {/* Preload AdSense script */}
        {process.env.NODE_ENV === 'production' && (
          <script 
            async 
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        {/* Các thẻ meta khác */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}