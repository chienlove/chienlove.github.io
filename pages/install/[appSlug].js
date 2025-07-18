import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

export async function getServerSideProps({ params }) {
  const { data: app } = await supabase
    .from('apps')
    .select('*')
    .eq('slug', params.appSlug)
    .single();

  if (!app) {
    return {
      notFound: true,
    };
  }

  return {
    props: { app },
  };
}

export default function InstallPage({ app }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/generate-token?id=${app.id}`);
      const data = await res.json();
      if (data?.installUrl) {
        window.location.href = data.installUrl;
      } else {
        alert('Không thể tạo link cài đặt');
      }
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi tạo link cài đặt');
    }
  };

  return (
    <>
      <Head>
        <title>Cài đặt {app.name}</title>
      </Head>
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full text-center">
          <img
            src={app.icon_url}
            alt={app.name}
            className="w-24 h-24 rounded-xl mx-auto mb-4 shadow-md"
          />
          <h1 className="text-2xl font-bold text-gray-800 mb-1">{app.name}</h1>
          <p className="text-gray-500 text-sm mb-4">
            Phiên bản {app.version}
          </p>

          {countdown > 0 ? (
            <p className="text-gray-600">
              Tải xuống sau <span className="font-bold">{countdown}</span> giây...
            </p>
          ) : (
            <button
              onClick={handleDownload}
              className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>Tải xuống ngay</span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}