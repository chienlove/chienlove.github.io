// pages/delete-data.js
import Head from 'next/head';

export default function DeleteData() {
  return (
    <>
      <Head>
        <title>Yêu cầu xoá dữ liệu | StoreiOS</title>
      </Head>
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Yêu cầu xoá dữ liệu cá nhân</h1>
        <p className="mb-4">
          Nếu bạn muốn xoá tất cả dữ liệu cá nhân của mình (tên, email, ảnh đại diện, bình luận...), vui lòng gửi email đến:
        </p>
        <p className="font-semibold text-blue-600">boypink93@gmail.com</p>
        <p className="mb-4 mt-4">Chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 72 giờ.</p>
        <p className="text-sm text-gray-500 mt-6">Cập nhật lần cuối: 29/08/2025</p>
      </div>
    </>
  );
}