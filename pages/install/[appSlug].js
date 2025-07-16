import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';

export async function getServerSideProps(context) {
  const { appSlug } = context.params;
  
  const { data: app, error } = await supabase
    .from('apps')
    .select('id, name, version, icon_url, description, download_link, category')
    .eq('slug', appSlug)
    .single();

  if (!app || error) {
    return { notFound: true };
  }

  return { props: { app } };
}

export default function InstallPage({ app }) {
  const [countdown, setCountdown] = useState(5);
  const router = useRouter();
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - countdown / 5);

  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = app.download_link;
      return;
    }
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown, app.download_link]);

  return (
    <Layout fullWidth>
      <Head>
        <title>{`Tải ${app.name} | Tự động cài đặt sau ${countdown}s`}</title>
        <meta name="description" content={`Tải xuống ${app.name} phiên bản ${app.version}`} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              <circle
                cx="50" cy="50" r={radius}
                fill="none" stroke="#3b82f6" strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform="rotate(-90 50 50)"
                className="transition-all duration-1000 ease-linear"
              />
            </svg>
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-gray-800">
              {countdown}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">{app.name}</h1>
          <p className="text-gray-600 mb-4">Phiên bản: {app.version}</p>
          
          <p className="mb-6 text-gray-700">
            Ứng dụng sẽ tự động tải sau <span className="font-bold">{countdown}</span> giây...
          </p>

          <div className="flex flex-col space-y-3">
            <button
              onClick={() => window.location.href = app.download_link}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-all hover:scale-105 active:scale-95"
            >
              Tải xuống ngay
            </button>
            <button
              onClick={() => router.push('/')}
              className="border border-gray-300 bg-white text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-all"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}