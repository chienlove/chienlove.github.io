// pages/about.js
import Head from 'next/head';
import Layout from '../components/Layout';

export default function AboutPage() {
  return (
    <Layout>
      <Head>
        <title>Giới thiệu - storeios.net</title>
        <meta
          name="description"
          content="storeios.net là trang hỗ trợ ký và cài đặt ứng dụng iOS, không chia sẻ hack, crack, cheat hay ứng dụng trả phí lậu. Tôn trọng bản quyền nhà phát triển."
        />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">
          Giới thiệu về <span className="text-blue-600">storeios.net</span>
        </h1>

        <section className="space-y-4 mb-8">
          <p>
            <strong>storeios.net</strong> là một trang web được xây dựng với mục tiêu
            hỗ trợ người dùng iOS trong việc <strong>ký (sign)</strong> và{' '}
            <strong>cài đặt ứng dụng (sideload)</strong> một cách thuận tiện hơn,
            thông qua các phương thức như:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Ký ứng dụng bằng chứng chỉ doanh nghiệp hoặc chứng chỉ cá nhân.</li>
            <li>Cài đặt ứng dụng trực tiếp từ trình duyệt bằng link itms-services.</li>
            <li>Hỗ trợ tạo file plist, link cài đặt, và các bước kỹ thuật liên quan.</li>
          </ul>
          <p>
            Chúng tôi tập trung vào việc cung cấp giải pháp kỹ thuật, không nhằm mục đích
            phân phối phần mềm lậu hay xâm phạm bản quyền bất kỳ bên thứ ba nào.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Định hướng nội dung</h2>
          <p>Nội dung trên storeios.net được định hướng theo các nguyên tắc:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Hướng dẫn người dùng <strong>cài đặt ứng dụng hợp pháp</strong> mà họ có quyền sử dụng.
            </li>
            <li>
              Chia sẻ thông tin kỹ thuật liên quan đến iOS, chứng chỉ, provisioning profile,
              và các công cụ sign/cài đặt.
            </li>
            <li>
              Hỗ trợ nhà phát triển ứng dụng tiếp cận người dùng thông qua các hướng dẫn cài đặt
              và thông tin giới thiệu ứng dụng.
            </li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Cam kết về bản quyền & nội dung</h2>
          <p>
            Chúng tôi <strong>không chia sẻ</strong> và <strong>không khuyến khích</strong>:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Các bản <strong>hack</strong>, <strong>crack</strong>, <strong>mod</strong> hoặc <strong>cheat</strong> ứng dụng/game.</li>
            <li>
              Phân phối <strong>ứng dụng trả phí</strong> một cách miễn phí khi không có sự cho phép
              của nhà phát triển hoặc chủ sở hữu bản quyền.
            </li>
            <li>
              Các nội dung vi phạm điều khoản sử dụng của Apple, App Store hoặc các nền tảng phân phối
              ứng dụng hợp pháp khác.
            </li>
          </ul>
          <p>
            Mọi nội dung, liên kết, hoặc file có dấu hiệu vi phạm bản quyền, chia sẻ phần mềm lậu hoặc
            gây hại cho người dùng đều sẽ được xem xét và gỡ bỏ khi phát hiện hoặc khi nhận được yêu cầu
            hợp lệ từ chủ sở hữu.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Giới hạn trách nhiệm</h2>
          <p>
            storeios.net hoạt động dưới dạng <strong>hướng dẫn kỹ thuật</strong> và{' '}
            <strong>trung gian hiển thị thông tin</strong>. Việc bạn sử dụng bất kỳ ứng dụng, file IPA
            hoặc dịch vụ bên thứ ba nào được giới thiệu hoặc liên kết từ trang đều là <strong>quyết định
            cá nhân</strong> của bạn.
          </p>
          <p>
            Chúng tôi không chịu trách nhiệm cho:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Các vấn đề phát sinh do việc cài đặt ứng dụng không tương thích hoặc lỗi hệ thống.</li>
            <li>Bất kỳ thiệt hại nào liên quan đến mất dữ liệu, bảo mật tài khoản, hoặc thiết bị.</li>
            <li>Nội dung, chính sách và hành vi của các trang web/ dịch vụ bên thứ ba mà chúng tôi liên kết.</li>
          </ul>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Đối tượng sử dụng</h2>
          <p>
            Trang web hướng tới người dùng đã có <strong>hiểu biết cơ bản về iOS</strong>, cài đặt ứng dụng,
            và chấp nhận các rủi ro tiềm ẩn khi sử dụng các phương pháp cài đặt ngoài App Store.
          </p>
          <p>
            storeios.net <strong>không dành cho trẻ em</strong> hoặc người dùng chưa đủ nhận thức về bảo mật
            và quyền riêng tư, trừ khi có sự giám sát của người lớn.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">Quảng cáo & đối tác</h2>
          <p>
            Để duy trì hoạt động, storeios.net có thể hiển thị <strong>quảng cáo</strong> hoặc liên kết
            tiếp thị (affiliate) từ các đối tác. Chúng tôi cố gắng lựa chọn đối tác uy tín, tuy nhiên
            không thể kiểm soát toàn bộ nội dung từ bên thứ ba.
          </p>
          <p>
            Người dùng nên luôn kiểm tra kỹ thông tin, đọc điều khoản sử dụng và chính sách quyền riêng tư
            của các dịch vụ bên ngoài trước khi đăng ký hoặc thanh toán.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Liên hệ</h2>
          <p>
            Nếu bạn là <strong>nhà phát triển</strong>, chủ sở hữu bản quyền, hoặc người dùng có thắc mắc/
            yêu cầu gỡ bỏ nội dung, vui lòng liên hệ:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email: <span className="font-mono">admin@storeios.net</span></li>
            <li>Tiêu đề gợi ý: <em>Yêu cầu hỗ trợ / Gỡ nội dung - storeios.net</em></li>
          </ul>
          <p>
            Chúng tôi luôn sẵn sàng hợp tác để đảm bảo quyền lợi chính đáng của nhà phát triển và người dùng.
          </p>
        </section>
      </main>
    </Layout>
  );
}