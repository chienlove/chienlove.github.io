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

/* ===================== SSR ===================== */
export async function getServerSideProps({ params, query }) {
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

  const isIpaDownload = query.action === 'download';
  const secret = process.env.JWT_SECRET;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://storeios.net';

  // 1. Tùy chỉnh Payload và Thời gian sống (exp) của Token
  const payload = isIpaDownload
    ? { id: app.id, ipa_name: encodeURIComponent(app.download_link) } // Payload cho Download Token
    : { ipa_name: encodeURIComponent(app.download_link) };           // Payload cho Plist Token

  const expiresIn = isIpaDownload ? '60s' : '40s'; // Download token có thể dài hơn
  const token = jwt.sign(payload, secret, { expiresIn });

  // 2. Định nghĩa các URL
  // Link Install (cho itms-services) - Dùng Plist Token
  const installUrl = `itms-services://?action=download-manifest&url=${
    encodeURIComponent(`${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${token}`)
  }`;

  // Link Download IPA (cho API download-ipa) - Dùng Download Token
  const downloadIpaUrl = `${baseUrl}/api/download-ipa?slug=${encodeURIComponent(app.slug)}&token=${encodeURIComponent(token)}`;

  // Raw Plist URL (dùng để kiểm tra HEAD trước khi cài đặt)
  const rawPlistUrl = `${baseUrl}/api/plist?ipa_name=${encodeURIComponent(app.download_link)}&token=${token}`;
  
  // Trả về props
  return {
    props: {
      app,
      installUrl, 
      downloadIpaUrl,
      rawPlistUrl,
      // Chuyển đổi exp string sang số (cho client-side timer)
      tokenExpiresIn: parseInt(expiresIn, 10), 
      isIpaDownload,
    },
  };
}

/* ===================== CLIENT COMPONENT ===================== */
export default function InstallPage({ app, installUrl, downloadIpaUrl, rawPlistUrl, tokenExpiresIn, isIpaDownload }) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(3); // Đếm ngược 3 giây
  const [tokenTimer, setTokenTimer] = useState(tokenExpiresIn); // Thời gian sống của token

  useEffect(() => {
    // Đếm ngược 3 giây trước khi hiển thị nút
    const initialTimer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    // Đếm ngược thời gian sống của token
    const tokenRefreshTimer = setInterval(() => {
      setTokenTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(initialTimer);
      clearInterval(tokenRefreshTimer);
    };
  }, []);

  const handleDownload = async () => {
    if (tokenTimer <= 0) {
      toast.error('Liên kết đã hết hạn. Vui lòng tải lại trang.');
      return;
    }

    if (isIpaDownload) {
      // Logic cho TẢI IPA (Chuyển hướng đến /api/download-ipa)
      
      // 1. Tăng lượt tải ngay (hoặc để /api/download-ipa xử lý)
      fetch(`/api/admin/add-download?id=${app.id}`, { method: 'POST' }).catch(() => {});
      
      // 2. Chuyển hướng trình duyệt đến API tải IPA
      window.location.href = downloadIpaUrl;

    } else {
      // Logic cho CÀI ĐẶT (itms-services) - Giữ nguyên logic cũ
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

        // Kích hoạt itms-services
        window.location.href = installUrl;
      } catch (err) {
        console.error('Lỗi khi kiểm tra liên kết:', err);
        toast.error('Lỗi khi tải ứng dụng. Vui lòng thử lại.');
      }
    }
  };

  const title = isIpaDownload ? `Tải IPA: ${app.name}` : `Cài đặt: ${app.name}`;
  const icon = isIpaDownload ? faFileArrowDown : faRocket;

  return (
    <Layout>
      <Head>
        <title>{title}</title>
      </Head>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 dark:bg-zinc-900 transition-colors">
        <div className="w-full max-w-md bg-white dark:bg-zinc-800 rounded-xl shadow-2xl p-6 md:p-8 text-center transition-all">
          
          <FontAwesomeIcon icon={icon} className="text-5xl text-blue-500 dark:text-blue-400 mb-6" />

          <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{app.name}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Phiên bản: {app.version}</p>

          {/* Cảnh báo hết hạn token */}
          <div 
            className={`text-sm mb-4 transition-all duration-300 ${
              tokenTimer > 0 ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'
            }`}
          >
            {tokenTimer > 0 ? (
              <>Liên kết sẽ hết hạn sau: <span className="font-semibold">{tokenTimer}s</span></>
            ) : (
              <span className="text-red-500 dark:text-red-400 font-medium">Liên kết đã hết hạn. Vui lòng tải lại trang.</span>
            )}
          </div>
          
          {/* Thông báo và Nút Hành động */}
          <div className="flex flex-col space-y-3">
            <p className="mb-2 text-gray-700 dark:text-gray-300">
                {countdown > 0
                ? <>Vui lòng chờ <span className="font-bold">{countdown}</span> giây trước khi tiếp tục...</>
                : isIpaDownload
                    ? <>Nhấn nút bên dưới để tải file IPA trực tiếp.</> // Nội dung cho TẢI IPA
                    : <>Nhấn nút bên dưới để bắt đầu cài đặt ứng dụng qua itms-services.</> // Nội dung cho CÀI ĐẶT
                }
            </p>

            {countdown === 0 && tokenTimer > 0 && (
              <button
                onClick={handleDownload}
                className="bg-gradient-to-r from-green-400 to-blue-500 hover:from-green-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-lg transition-all hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
              >
                <FontAwesomeIcon icon={isIpaDownload ? faFileArrowDown : faDownload} />
                <span>{isIpaDownload ? 'Tải file IPA ngay' : 'Cài đặt ngay'}</span>
              </button>
            )}

            <button
              onClick={() => router.push('/')}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-700 text-gray-700 dark:text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-600 transition-all flex justify-center items-center gap-2"
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Về trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
