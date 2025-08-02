// pages/_app.js
import { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';

function MyApp({ Component, pageProps }) {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
    document.documentElement.classList.toggle('dark', savedMode);
  }, []);

  return (
    <>
      <ToastContainer
        position="top-center"
        autoClose={4000}
        hideProgressBar
        closeOnClick
        pauseOnHover
        draggable
        style={{ top: '25%' }}
        toastClassName={({ type }) =>
          `!rounded-lg !p-4 !shadow-xl !text-base text-center ${
            type === 'error'
              ? 'bg-red-100 text-red-800 border border-red-300'
              : type === 'warning'
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-white text-gray-800 border border-gray-200'
          }`
        }
      />
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;