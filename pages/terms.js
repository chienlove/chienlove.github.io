// pages/terms.js
import Head from 'next/head';
import Layout from '../components/Layout';

export default function TermsPage() {
  return (
    <Layout>
      <Head>
        <title>Điều khoản sử dụng - storeios.net</title>
        <meta
          name="description"
          content="Điều khoản sử dụng của storeios.net: quy định về nội dung, bản quyền, trách nhiệm, dữ liệu và sử dụng dịch vụ hỗ trợ ký & cài đặt ứng dụng iOS."
        />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-6">
          Điều khoản sử dụng <span className="text-blue-600">storeios.net</span>
        </h1>

        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          <strong>Lưu ý:</strong> Đây là bản điều khoản mang tính tham khảo, không phải tư vấn pháp lý.
          Nếu bạn cần đảm bảo tuân thủ pháp luật tại quốc gia của mình, hãy tham khảo ý kiến chuyên gia pháp lý.
        </p>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">1. Chấp nhận điều khoản</h2>
          <p>
            Khi truy cập và sử dụng <strong>storeios.net</strong>, bạn xác nhận rằng bạn đã đọc,
            hiểu và đồng ý tuân thủ các điều khoản sử dụng này. Nếu bạn không đồng ý với bất kỳ nội
            dung nào, vui lòng ngừng sử dụng trang web ngay lập tức.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">2. Mô tả dịch vụ</h2>
          <p>storeios.net cung cấp các dịch vụ và nội dung chính sau:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Hướng dẫn ký và cài đặt (sideload) ứng dụng iOS bằng nhiều phương thức khác nhau.</li>
            <li>Giới thiệu ứng dụng, tổng hợp thông tin và liên kết đến nguồn cài đặt hợp pháp (nếu có).</li>
            <li>Công cụ, tài nguyên hoặc tài liệu kỹ thuật hỗ trợ người dùng trong quá trình cài đặt.</li>
          </ul>
          <p>
            Dịch vụ có thể thay đổi, nâng cấp hoặc tạm ngừng bất cứ lúc nào mà không cần thông báo trước,
            nhưng chúng tôi sẽ cố gắng thông tin rõ ràng trên trang khi có thay đổi lớn.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">3. Nội dung bị cấm</h2>
          <p>
            Khi sử dụng storeios.net, bạn đồng ý <strong>không</strong> sử dụng trang web cho các mục đích sau:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Tải lên, chia sẻ hoặc phát tán các bản hack, crack, cheat, mod game hoặc ứng dụng đã bị chỉnh sửa.</li>
            <li>
              Phân phối ứng dụng trả phí miễn phí hoặc bằng hình thức vi phạm bản quyền, trái với điều khoản
              của nhà phát triển hoặc App Store.
            </li>
            <li>
              Chia sẻ nội dung độc hại, malware, spyware, mã độc, hoặc bất kỳ nội dung nào gây hại cho thiết bị
              và dữ liệu của người dùng khác.
            </li>
            <li>
              Lợi dụng dịch vụ để thực hiện hành vi lừa đảo, chiếm đoạt tài sản, hoặc vi phạm pháp luật hiện hành.
            </li>
            <li>
              Gây cản trở hoạt động của trang web (DDoS, spam request, quét lỗ hổng trái phép…).
            </li>
          </ul>
          <p>
            Chúng tôi có quyền hạn chế truy cập, xóa nội dung hoặc chặn tài khoản/địa chỉ IP nếu phát hiện hành vi
            vi phạm các quy định trên.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">4. Bản quyền & sở hữu trí tuệ</h2>
          <p>
            Mọi nội dung nguyên gốc trên storeios.net (bao gồm nhưng không giới hạn: bài viết, mô tả, hướng dẫn,
            thiết kế giao diện) thuộc quyền sở hữu của chúng tôi hoặc được sử dụng theo giấy phép hợp pháp.
          </p>
          <p>
            Các tên thương mại, logo, biểu tượng, hình ảnh ứng dụng, nhãn hiệu của bên thứ ba (như Apple, App Store,
            nhà phát triển ứng dụng…) chỉ được sử dụng với mục đích mô tả, nhận diện và vẫn thuộc quyền sở hữu của
            các bên liên quan.
          </p>
          <p>
            Bạn không được phép sao chép, tái phân phối, chỉnh sửa hoặc sử dụng lại nội dung từ storeios.net cho
            mục đích thương mại khi chưa có sự đồng ý bằng văn bản từ chúng tôi.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">5. Liên kết & dịch vụ bên thứ ba</h2>
          <p>
            storeios.net có thể chứa các liên kết đến website, dịch vụ, hoặc nội dung của bên thứ ba. Những liên
            kết này chỉ mang tính chất tham khảo, hỗ trợ người dùng.
          </p>
          <p>
            Chúng tôi không kiểm soát và không chịu trách nhiệm đối với:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Nội dung, chính sách quyền riêng tư và điều khoản sử dụng của các website/dịch vụ bên ngoài.</li>
            <li>Bất kỳ thiệt hại hoặc tổn thất nào phát sinh từ việc bạn sử dụng dịch vụ của bên thứ ba.</li>
          </ul>
          <p>
            Bạn nên tự đánh giá mức độ tin cậy và đọc kỹ các điều khoản liên quan trước khi sử dụng dịch vụ,
            đăng nhập hoặc thanh toán trên các website/ứng dụng đó.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">6. Trách nhiệm của người dùng</h2>
          <p>Bạn chịu trách nhiệm cho mọi hành vi và quyết định khi:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Cài đặt ứng dụng bằng các phương thức sign/sideload được hướng dẫn trên trang.</li>
            <li>Cấp quyền cho ứng dụng trên thiết bị của mình (quyền truy cập, quyền hệ thống, v.v.).</li>
            <li>
              Sử dụng tài khoản Apple ID, tài khoản bên thứ ba, hoặc thông tin cá nhân để đăng nhập vào bất kỳ dịch vụ nào.
            </li>
          </ul>
          <p>
            Bạn nên sao lưu dữ liệu quan trọng và cân nhắc kỹ trước khi cài đặt các ứng dụng không đến trực tiếp
            từ App Store.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">7. Giới hạn trách nhiệm</h2>
          <p>
            Trong phạm vi pháp luật cho phép, storeios.net và các cá nhân liên quan không chịu trách nhiệm đối với
            bất kỳ thiệt hại trực tiếp, gián tiếp, ngẫu nhiên hoặc hậu quả nào phát sinh từ:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Lỗi kỹ thuật, lỗi server, gián đoạn dịch vụ hoặc mất dữ liệu.</li>
            <li>
              Việc sử dụng hoặc không thể sử dụng nội dung, hướng dẫn, công cụ hoặc dịch vụ được cung cấp trên trang.
            </li>
            <li>
              Các vấn đề bảo mật, thất thoát dữ liệu cá nhân hoặc tài khoản do người dùng tự cài đặt ứng dụng,
              tự cấu hình thiết bị.
            </li>
          </ul>
          <p>
            Bạn sử dụng trang web và các nội dung trên đây hoàn toàn trên cơ sở <strong>tự chịu trách nhiệm</strong>.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">8. Dữ liệu, cookie & quyền riêng tư</h2>
          <p>
            storeios.net có thể sử dụng cookie, local storage hoặc các công cụ phân tích (analytics) để:
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Cải thiện trải nghiệm người dùng.</li>
            <li>Đo lường lưu lượng truy cập, hiệu quả nội dung và quảng cáo.</li>
          </ul>
          <p>
            Chúng tôi cố gắng tối giản việc thu thập dữ liệu cá nhân. Nếu có trang riêng về quyền riêng tư
            (Privacy Policy), các quy định chi tiết sẽ được giải thích tại đó.
          </p>
        </section>

        <section className="space-y-4 mb-8">
          <h2 className="text-2xl font-semibold">9. Thay đổi điều khoản</h2>
          <p>
            Chúng tôi có thể cập nhật hoặc sửa đổi Điều khoản sử dụng này theo thời gian để phù hợp với thay đổi
            trong dịch vụ hoặc yêu cầu pháp lý.
          </p>
          <p>
            Phiên bản cập nhật sẽ được đăng trên trang này kèm theo ngày hiệu lực. Việc tiếp tục sử dụng trang
            sau khi điều khoản được cập nhật đồng nghĩa với việc bạn chấp nhận các thay đổi đó.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">10. Liên hệ</h2>
          <p>Nếu bạn có câu hỏi liên quan đến Điều khoản sử dụng, vui lòng liên hệ:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email: <span className="font-mono">admin@storeios.net</span></li>
            <li>Tiêu đề gợi ý: <em>Hỏi đáp / Khiếu nại về Điều khoản sử dụng - storeios.net</em></li>
          </ul>
          <p>Chúng tôi sẽ cố gắng phản hồi trong thời gian sớm nhất có thể.</p>
        </section>
      </main>
    </Layout>
  );
}