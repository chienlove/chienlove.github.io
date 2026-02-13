import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

config.autoAddCss = false;

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();
  const isAdminPage = router.pathname.startsWith('/admin');

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    let isLeavingPage = false;

    const shouldIgnore = (message = '') => {
      const msg = String(message).toLowerCase();
      if (msg.includes('load failed')) return true;
      if (msg.includes('abort')) return true;
      return false;
    };

    const sendLogOnce = (() => {
      const seen = new Set();
      return (payload) => {
        const key = `${payload.error}|${payload.url}`;
        if (seen.has(key)) return;
        seen.add(key);

        fetch('/api/log-client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      };
    })();

    const onError = (event) => {
      if (isLeavingPage) return;
      if (!event) return;

      const msg = event?.message || event?.error?.message;
      if (shouldIgnore(msg)) return;

      sendLogOnce({
        url: window.location.href,
        userAgent: navigator.userAgent,
        error: String(msg || 'Unknown error'),
        stack: String(event?.error?.stack || 'no stack'),
      });
    };

    const onUnhandled = (event) => {
      if (isLeavingPage) return;
      if (!event) return;

      const msg = event?.reason?.message || event?.reason;
      if (shouldIgnore(msg)) return;

      sendLogOnce({
        url: window.location.href,
        userAgent: navigator.userAgent,
        error: String(msg || 'Unhandled rejection'),
        stack: String(event?.reason?.stack || 'no stack'),
      });
    };

    const onPageHide = () => {
      isLeavingPage = true;
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Android/.test(ua);
    if (!isSafari) return;
    const noop = () => {};
    window.addEventListener('unload', noop);
    const onPageShow = (e) => {
      if (e && e.persisted) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('unload', noop);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  useEffect(() => {
    const isAdminPath = (p) => typeof p === 'string' && p.startsWith('/admin');
    const handler = ({ url, as }) => {
      const current = window.location.pathname;
      const goingTo = as || url || '';
      if (isAdminPath(current) || isAdminPath(goingTo)) {
        window.location.href = goingTo || '/admin';
        return false;
      }
      return true;
    };
    router.beforePopState(handler);
    return () => router.beforePopState(() => true);
  }, [router]);

  return (
    <>
      {!isAdminPage && (
        <Script
          id="adsbygoogle-init"
          strategy="afterInteractive"
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3905625903416797"
          crossOrigin="anonymous"
        />
      )}
      
      <Component {...pageProps} />
      
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar
        closeOnClick
        pauseOnHover
        draggable
        style={{ top: '25%' }}
        toastClassName={({ type }) =>
          `!w-[90%] sm:!w-[360px] !mx-auto !rounded-xl !p-4 !shadow-lg !text-base text-center ${
            type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : type === 'warning'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-white text-gray-800 border border-gray-200'
          }`
        }
        bodyClassName="!p-0"
      />
    </>
  );
}

export default MyApp;
