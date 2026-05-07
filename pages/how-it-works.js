// pages/how-it-works.js
import Head from 'next/head';
import Layout from '../components/Layout';

export default function HowItWorks() {
  return (
    <Layout>
      <Head>
        <title>StoreiOS hoạt động như thế nào? | Giải thích minh bạch</title>
        <meta
          name="description"
          content="StoreiOS không chia sẻ hack, crack, cheat, mod hay phần mềm vi phạm bản quyền. Toàn bộ ứng dụng người dùng tự tải lên hoặc là ứng dụng hợp pháp."
        />
      </Head>

      <div className="max-w-3xl mx-auto px-4 py-10 prose prose-lg dark:prose-invert">
        <h1>StoreiOS hoạt động như thế nào?</h1>

        <p>
          StoreiOS là nền tảng hỗ trợ người dùng iOS cài đặt ứng dụng hợp pháp,
          bao gồm ứng dụng cá nhân, ứng dụng doanh nghiệp, ứng dụng thử nghiệm (TestFlight)
          hoặc các ứng dụng do người dùng tự sở hữu.
        </p>

        <h2>1. StoreiOS KHÔNG chia sẻ nội dung vi phạm</h2>
        <ul>
          <li>❌ Không cung cấp hack / crack / cheat / mod</li>
          <li>❌ Không chia sẻ ứng dụng trả phí khi chưa được phép</li>
          <li>❌ Không phân phối phần mềm vi phạm bản quyền</li>
          <li>❌ Không lưu trữ file IPA độc hại</li>
        </ul>

        <h2>2. Dữ liệu do người dùng tự sở hữu</h2>
        <p>
          Người dùng tải lên hoặc sử dụng ứng dụng họ sở hữu hợp pháp.
          StoreiOS chỉ đóng vai trò hỗ trợ ký ứng dụng và cung cấp liên kết cài đặt.
        </p>

        <h2>3. Hỗ trợ ký ứng dụng hợp pháp</h2>
        <p>
          Hệ thống ký IPA sử dụng chứng chỉ doanh nghiệp hoặc chứng chỉ cá nhân
          do người dùng cung cấp. StoreiOS không tự ý ký app, không phân phối app trái phép.
        </p>

        <h2>4. Minh bạch & bảo mật</h2>
        <p>
          StoreiOS tuân thủ đầy đủ chính sách bảo mật, không thu thập dữ liệu nhạy cảm,
          không truy cập nội dung ứng dụng của người dùng và không lưu trữ dữ liệu cá nhân.
        </p>

        <h2>5. Tại sao bạn an toàn khi sử dụng StoreiOS?</h2>
        <ul>
          <li>Cấu trúc minh bạch, rõ ràng</li>
          <li>Tuân thủ chính sách nội dung của Google & Ezoic</li>
          <li>Không lưu trữ nội dung độc hại</li>
          <li>Không phân phối app trái phép</li>
        </ul>

        <p>
          Nếu bạn cần thêm thông tin, vui lòng xem trang
          <a href="/terms"> Điều khoản </a>
          hoặc
          <a href="/privacy-policy"> Chính sách bảo mật </a>.
        </p>
      </div>
    </Layout>
  );
}