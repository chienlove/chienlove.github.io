import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faHome } from '@fortawesome/free-solid-svg-icons';

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
  const [countdown, setCountdown] = useState(10); // Đã tăng lên 10s
  const router = useRouter();

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - countdown / 10); // Cập nhật theo 10s

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDownload = async () => {
  try {
    const plistName = app.download_link;
    if (!plistName) throw new Error('Tên file plist không được để trống');

    const res = await fetch(`/api/generate-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: app.id, ipa_name: plistName })
    });

    const data = await res.json();

    if (data.installUrl) {
      setTimeout(() => {
        window.location.href = data.installUrl;
      }, 300);
    } else {
      alert('Không thể tạo liên kết cài đặt.');
    }
  } catch (err) {
    console.error('Lỗi khi tạo liên kết:', err);
    alert('Đã có lỗi xảy ra khi tạo liên kết cài đặt: ' + err.message);
  }
};

  return (
    <Layout fullWidth>
      <Head>
        <title>{`Tải ${app.name} | Cài đặt ứng dụng`}</title>
        <meta name="description" content={`Tải xuống ${app.name} phiên bản ${app.version}`} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={radius}
                fill="none" stroke="#22c55e" strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className={countdown > 0 ? 'transition-all duration-1000 ease-linear' : ''}
              />
            </svg>
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-gray-800">
              {countdown > 0 ? countdown : '0'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{app.name}</h1>
          <p className="text-gray-600 mb-4">Phiên bản: {app.version}</p>

          <p className="mb-6 text-gray-700">
            {countdown > 0
              ? <>Vui lòng chờ <span className="font-bold">{countdown}</span> giây trước khi tải...</>
              : <>Nhấn nút bên dưới để tải ứng dụng.</>
            }
          </p>

          <div className="flex flex-col space-y-3">
            {countdown === 0 && (
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={faDownload} />
                <span>Tải xuống ngay</span>
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className="border border-gray-300 bg-white text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 transition-all flex justify-center items-center gap-2"
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Quay lại trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}