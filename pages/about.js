import Head from 'next/head';
import Layout from '../components/Layout';

export default function AboutPage() {
  const title = 'Giới thiệu StoreiOS – Nền tảng hỗ trợ ký & cài đặt ứng dụng iOS hợp pháp';
  const description =
    'StoreiOS hỗ trợ người dùng ký và cài đặt ứng dụng iOS hợp pháp, không chia sẻ hack, crack, mod, cheat hay ứng dụng trả phí lậu. Hoàn toàn độc lập, không liên kết Apple.';
  const url = 'https://storeios.net/about';

  return (
    <Layout>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {/* OG */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <main className="max-w-4xl mx-auto px-4 py-10 leading-relaxed">
        <h1 className="text-3xl font-bold mb-6">Giới thiệu về StoreiOS</h1>

        <section className="space-y-4 mb-8">
          <p>
            <strong>StoreiOS</strong> là nền tảng hỗ trợ người dùng iOS trong việc{' '}
            <strong>ký ứng dụng (sign IPA)</strong> và{' '}
            <strong>cài đặt ứng dụng iOS hợp pháp</strong> thông qua các phương thức an toàn như{' '}
            chứng chỉ doanh nghiệp, chứng chỉ cá nhân và liên kết{' '}
            <strong>itms-services</strong>.
          </p>

          <p>
            StoreiOS là một trang web độc lập, <strong>không liên kết với Apple Inc.</strong> hoặc
            bất kỳ tổ chức/phần mềm nào khác.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Cam kết nội dung & tính hợp pháp</h2>

          <p>Chúng tôi <strong>không</strong> chia sẻ hoặc quảng bá:</p>

          <ul className="list-disc ml-6 space-y-1">
            <li>Ứng dụng hack, crack, mod, cheat hoặc chỉnh sửa trái phép.</li>
            <li>Ứng dụng trả phí được phân phối miễn phí trái phép.</li>
            <li>File IPA vi phạm bản quyền hoặc gây hại cho người dùng.</li>
          </ul>

          <p className="mt-4">
            StoreiOS chỉ hỗ trợ cung cấp <strong>liên kết cài đặt ứng dụng đã được người dùng tự sở hữu</strong>,
            hoặc đã được họ tải lên hệ thống theo đúng quyền sử dụng của họ.
          </p>

          <p className="mt-2">
            Mọi nội dung vi phạm bản quyền khi được phát hiện hoặc được yêu cầu gỡ bỏ bởi chủ sở hữu sẽ được xử lý
            ngay lập tức.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Định hướng phát triển</h2>
          <p>StoreiOS hướng tới:</p>

          <ul className="list-disc ml-6 space-y-1">
            <li>Cung cấp giải pháp cài đặt app hợp pháp và thuận tiện.</li>
            <li>Hỗ trợ cộng đồng iOS tìm hiểu về kỹ thuật ký và cài đặt ứng dụng.</li>
            <li>Hỗ trợ nhà phát triển quảng bá ứng dụng.</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Giới hạn trách nhiệm</h2>
          <p>
            StoreiOS chỉ đóng vai trò như <strong>nền tảng hiển thị thông tin</strong> và{' '}
            <strong>công cụ hỗ trợ kỹ thuật</strong>.  
            Việc cài đặt ứng dụng là lựa chọn của người dùng và họ phải chịu trách nhiệm cho hành vi,
            dữ liệu và tài khoản của họ.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">Liên hệ</h2>
          <p>Nếu bạn cần hỗ trợ hoặc yêu cầu gỡ nội dung:</p>

          <ul className="list-disc ml-6 space-y-1">
            <li>
              Email: <strong>admin@storeios.net</strong>
            </li>
          </ul>
        </section>
      </main>
    </Layout>
  );
}