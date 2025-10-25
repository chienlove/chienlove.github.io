// pages/install/[appSlug].js
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../../components/Layout';
import { supabase } from '../../lib/supabase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faHome, faFileArrowDown, faRocket } from '@fortawesome/free-solid-svg-icons';
import jwt from 'jsonwebtoken';
import { toast } from 'react-toastify';

export async function getServerSideProps({ params, query }) { // THÊM query
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
  
  // KIỂM TRA ACTION
  const isIpaDownload = query.action === 'download';
  const secret = process.env.JWT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://storeios.net';

  // 1. Tùy chỉnh Payload và Thời gian sống (exp) của Token
  const expiresIn = isIpaDownload ? '60s' : '40s';
  const tokenExpiresInSeconds = parseInt(expiresIn, 10);
  
  const payload = isIpaDownload
    ? { id: app.id, ipa_name: encodeURIComponent(app.download_link) } // Download Token
    : { ipa_name: encodeURIComponent(app.download_link) };           // Plist Token (giữ nguyên logic cũ)

  const token = jwt.sign(payload, secret, { expiresIn });

  // 2. Định nghĩa các URL
  // Link Install (dùng cho itms-services)
  const installUrl = `itms-services://?action=download-manifest&url=${
    encodeURIComponent(`${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${token}`)
  }`;

  // Link Download IPA (dùng cho /api/download-ipa)
  const downloadIpaUrl = `/api/download-ipa?slug=${encodeURIComponent(app.slug)}&token=${encodeURIComponent(token)}`;
  
  // Raw Plist URL (dùng để kiểm tra HEAD trước khi cài đặt)
  const rawPlistUrl = `${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${token}`;


  return {
    props: {
      app,
      installUrl,
      downloadIpaUrl, // THÊM downloadIpaUrl
      rawPlistUrl,
      tokenExpiresIn: tokenExpiresInSeconds, // THỜI GIAN SỐNG MỚI
      isIpaDownload, // THÊM biến cờ
    },
  };
}

export default function InstallPage({ app, installUrl, downloadIpaUrl, rawPlistUrl, tokenExpiresIn, isIpaDownload }) { // NHẬN PROPS MỚI
  // Giữ nguyên countdown = 10 giây để giữ giao diện cũ
  const [countdown, setCountdown] = useState(10); 
  const [tokenTimer, setTokenTimer] = useState(tokenExpiresIn);
  const [hasStartedTokenTimer, setHasStartedTokenTimer] = useState(false);
  const router = useRouter();

  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - countdown / 10);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0 && !hasStartedTokenTimer) {
      setHasStartedTokenTimer(true);
    }
  }, [countdown, hasStartedTokenTimer]);

  useEffect(() => {
    if (!hasStartedTokenTimer) return;

    const timer = setInterval(() => {
      setTokenTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.warning('Liên kết đã hết hạn. Vui lòng tải lại trang.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStartedTokenTimer]);

  const handleDownload = async () => {
    if (tokenTimer <= 0) {
      toast.error('Liên kết đã hết hạn. Vui lòng tải lại trang.');
      return;
    }

    if (isIpaDownload) {
      // LOGIC MỚI: TẢI FILE IPA
      // Tăng lượt tải (tùy chọn)
      fetch(`/api/admin/add-download?id=${app.id}`, { method: 'POST' }).catch(() => {});
      window.location.href = downloadIpaUrl;
    } else {
      // LOGIC CŨ: CÀI ĐẶT
      try {
        const verify = await fetch(rawPlistUrl, { method: 'HEAD' });

        if (!verify.ok) {
          if (verify.status === 403) {
            toast.error('Liên kết đã hết hạn. Vui lòng tải lại trang.');
          } else if (verify.status === 404) {
            toast.error('Không tìm thấy file cài đặt.');
          } else {
            toast.error('Không thể xác minh liên kết cài đặt.');
          }
          return;
        }

        window.location.href = installUrl;
      } catch (err) {
        console.error('Lỗi khi kiểm tra liên kết:', err);
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
              ? <>Vui lòng chờ <span className="font-bold">{countdown}</span> giây trước khi {isIpaDownload ? 'tải file IPA' : 'cài đặt ứng dụng'}...</> // CẬP NHẬT TEXT
              : <>Nhấn nút bên dưới để {isIpaDownload ? 'tải file IPA' : 'tải ứng dụng'}.</> // CẬP NHẬT TEXT
            }
          </p>

          <div
            className={`text-sm text-gray-500 dark:text-gray-300 mb-4 transition-all duration-500 ease-out transform ${
              countdown === 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
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
                <FontAwesomeIcon icon={headerIcon} /> {/* SỬ DỤNG ICON TÙY CHỈNH */}
                <span>{buttonText}</span> {/* SỬ DỤNG TEXT TÙY CHỈNH */}
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
