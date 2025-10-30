// pages/_app.js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';
import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';
config.autoAddCss = false;

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);
  const router = useRouter();

  // Dark mode init
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  // ✅ Centralized Browser Error Logger
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;

    const sent = new WeakSet();

    const sendLog = (errorObj) => {
      try {
        if (!errorObj || sent.has(errorObj)) return;
        sent.add(errorObj);

        fetch('/api/log-client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: window.location.href,
            userAgent: navigator.userAgent,
            error: String(errorObj?.message || errorObj),
            stack: String(errorObj?.stack || 'no stack'),
          })
        }).catch(() => {});
      } catch {}
    };

    const onError = (event) => sendLog(event.error);
    const onUnhandled = (event) => sendLog(event.reason);

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandled);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandled);
    };
  }, []);

  // ✅ Fix Safari/iOS preview head refresh
  useEffect(() => {
    const refreshHead = () => {
      const head = document.querySelector('head');
      if (!head?.parentNode) return;
      const clone = head.cloneNode(true);
      head.parentNode.replaceChild(clone, head);
    };
    router.events.on('routeChangeComplete', refreshHead);
    setTimeout(refreshHead, 0);
    return () => router.events.off('routeChangeComplete', refreshHead);
  }, [router.events]);

  return (
    <>
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