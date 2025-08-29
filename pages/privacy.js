// pages/privacy.js
import Head from 'next/head';

export default function Privacy() {
  return (
    <>
      <Head>
        <title>Chính sách quyền riêng tư | StoreiOS</title>
      </Head>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Chính sách quyền riêng tư</h1>
        <p className="mb-4">
          Trang web này sử dụng thông tin từ tài khoản Facebook hoặc Google của bạn để xác thực đăng nhập.
        </p>
        <p className="mb-4">
          Chúng tôi chỉ lưu trữ các thông tin cơ bản như tên hiển thị, email và ảnh đại diện để hiển thị trong phần bình luận.
          Không chia sẻ hoặc bán dữ liệu cho bên thứ ba.
        </p>
        <p className="mb-4">
          Bạn có thể yêu cầu xoá tất cả dữ liệu cá nhân của mình bất kỳ lúc nào bằng cách truy cập trang{' '}
          <a href="/delete-data" className="text-blue-600 underline">Xoá dữ liệu</a>.
        </p>
        <p className="text-sm text-gray-500 mt-6">Cập nhật lần cuối: 29/08/2025</p>
      </div>
    </>
  );
}