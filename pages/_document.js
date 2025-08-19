// pages/_document.js
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi" className="scroll-smooth">
      <Head>
        <meta name="theme-color" content="#111827" />
        <meta name="color-scheme" content="dark light" />
        <link rel="icon" href="/favicon.ico" />

        {/* AdSense loader: chỉ nhúng 1 lần, dạng URL có ?client= */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
          crossOrigin="anonymous"
        />
      </Head>

      <body className="antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}