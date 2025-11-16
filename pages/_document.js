import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="vi" className="scroll-smooth">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#111827" />
        <meta name="color-scheme" content="dark light" />
        <meta name="google-adsense-account" content="ca-pub-3905625903416797" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        <script src="https://cmp.gatekeeperconsent.com/min.js" data-cfasync="false"></script>
        <script src="https://the.gatekeeperconsent.com/cmp.min.js" data-cfasync="false"></script>
        <script src="https://www.ezojs.com/ezoic/sa.min.js" data-cfasync="false" async></script>
        <script dangerouslySetInnerHTML={{__html:'window.ezstandalone=window.ezstandalone||{};window.ezstandalone.cmd=window.ezstandalone.cmd||[];'}} />

        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797" crossOrigin="anonymous"></script>
      </Head>
      <body className="antialiased bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}