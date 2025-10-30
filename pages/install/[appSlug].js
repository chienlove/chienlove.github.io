// pages/install/[appSlug].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faHome, faFileArrowDown } from '@fortawesome/free-solid-svg-icons';
import jwt from 'jsonwebtoken';
import { toast } from 'react-toastify';

export async function getServerSideProps({ params, query, req }) {
  const { data: app } = await supabase.from('apps').select('*').eq('slug', params.appSlug).single();
  if (!app) return { notFound: true };

  const isIpaDownload = query.action === 'download';
  const secret = process.env.JWT_SECRET;

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers['x-forwarded-host'] || req.headers.host;
  const baseUrl = `${proto}://${host}`;

  const expiresIn = isIpaDownload ? '60s' : '40s';
  const token = jwt.sign(
    { id: app.id, ipa_name: encodeURIComponent(app.download_link) },
    secret,
    { expiresIn }
  );

  // itms-services: có install=1 để /api/plist đếm installs
  const plistUrl    = `${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${encodeURIComponent(token)}&install=1`;
  const installUrl  = `itms-services://?action=download-manifest&url=${encodeURIComponent(plistUrl)}`;

  // link tải IPA (server đếm downloads)
  const downloadIpaUrl = `/api/download-ipa?slug=${encodeURIComponent(app.slug)}&token=${encodeURIComponent(token)}`;

  // HEAD verify: không có install=1, để không đếm
  const rawPlistUrl = `${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${encodeURIComponent(token)}`;

  return {
    props: {
      app,
      installUrl,
      downloadIpaUrl,
      rawPlistUrl,
      tokenExpiresIn: parseInt(expiresIn, 10),
      isIpaDownload,
    },
  };
}

export default function InstallPage({ app, installUrl, downloadIpaUrl, rawPlistUrl, tokenExpiresIn, isIpaDownload }) {
  const [countdown, setCountdown] = useState(10);
  const [tokenTimer, setTokenTimer] = useState(tokenExpiresIn);
  const [hasStartedTokenTimer, setHasStartedTokenTimer] = useState(false);
  const router = useRouter();

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - countdown / 10);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0 && !hasStartedTokenTimer) setHasStartedTokenTimer(true);
  }, [countdown, hasStartedTokenTimer]);

  useEffect(() => {
    if (!hasStartedTokenTimer) return;
    const t = setInterval(() => {
      setTokenTimer(prev => {
        if (prev <= 1) {
          clearInterval(t);
          toast.warning('Liên kết đã hết hạn. Vui lòng tải lại trang.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [hasStartedTokenTimer]);

  const handleDownload = async () => {
    if (tokenTimer <= 0) {
      toast.error('Liên kết đã hết hạn. Vui lòng tải lại trang.');
      return;
    }

    if (isIpaDownload) {
      // Server /api/download-ipa đã tự đếm
      window.location.href = downloadIpaUrl;
    } else {
      // HEAD verify: không đếm
      try {
        const verify = await fetch(rawPlistUrl, { method: 'HEAD' });
        if (!verify.ok) {
          if (verify.status === 403) toast.error('Liên kết đã hết hạn. Vui lòng tải lại trang.');
          else if (verify.status === 404) toast.error('Không tìm thấy file cài đặt.');
          else toast.error('Không thể xác minh liên kết cài đặt.');
          return;
        }
        // Mở itms-services: /api/plist sẽ đếm installs
        window.location.href = installUrl;
      } catch (e) {
        console.error('Verify error:', e);
        toast.error('Lỗi khi tải ứng dụng. Vui lòng thử lại.');
      }
    }
  };

  const buttonText = isIpaDownload ? 'Tải file IPA ngay' : 'Tải xuống ngay';
  const headerIcon = isIpaDownload ? faFileArrowDown : faDownload;

  return (
    <Layout fullWidth>
      <Head>
        <title>{isIpaDownload ? `Tải IPA ${app.name}` : `Cài đặt ${app.name}`}</title>
        <meta name="description" content={`Tải xuống ${app.name} phiên bản ${app.version}`} />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full text-center">
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
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-3xl font-bold text-gray-800 dark:text-white">
              {countdown > 0 ? countdown : '0'}
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{app.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Phiên bản: {app.version}</p>

          <p className="mb-2 text-gray-700 dark:text-gray-300">
            {countdown > 0
              ? <>Vui lòng chờ <span className="font-bold">{countdown}</span> giây trước khi {isIpaDownload ? 'tải file IPA' : 'cài đặt ứng dụng'}...</>
              : <>Nhấn nút bên dưới để {isIpaDownload ? 'tải file IPA' : 'tải ứng dụng'}.</>}
          </p>

          <div className={`text-sm text-gray-500 dark:text-gray-300 mb-4 transition-all duration-500 ease-out transform ${countdown === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
            {tokenTimer > 0 ? (
              <>Liên kết sẽ hết hạn sau: <span className="font-semibold">{tokenTimer}s</span></>
            ) : (
              <span className="text-red-500 dark:text-red-400 font-medium">Liên kết đã hết hạn. Vui lòng tải lại trang.</span>
            )}
          </div>

          <div className="flex flex-col space-y-3">
            {countdown === 0 && tokenTimer > 0 && (
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={headerIcon} />
                <span>{buttonText}</span>
              </button>
            )}
            <button
              onClick={() => router.push('/')}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all flex justify-center items-center gap-2"
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