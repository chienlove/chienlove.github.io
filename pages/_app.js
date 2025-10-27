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

  // Khởi động dark mode theo localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  // -------- FIX Safari/iOS: buộc reload <head> khi chuyển trang CSR --------
  useEffect(() => {
    const refreshHead = () => {
      // Clone để kích hoạt lại mọi thẻ meta/title trong head (Safari đọc lại preview)
      const head = document.querySelector('head');
      if (!head || !head.parentNode) return;
      const clone = head.cloneNode(true);
      head.parentNode.replaceChild(clone, head);
    };

    router.events.on('routeChangeComplete', refreshHead);
    // chạy một lần sau mount (phòng trường hợp vào từ client-side)
    setTimeout(refreshHead, 0);

    return () => router.events.off('routeChangeComplete', refreshHead);
  }, [router.events]);
  // -----------------------------------------------------------------------

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