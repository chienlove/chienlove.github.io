// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi">
      <Head>
        {/* ✅ Nhúng mã quảng cáo tự động vào HTML gốc */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
          crossOrigin="anonymous"
        />
        {/* Các thẻ meta khác của bạn có thể đặt ở đây */}
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}