export default function PrivacyPolicy() {
  return (
    <main style={{maxWidth:800,margin:'40px auto',padding:'0 16px',lineHeight:1.7}}>
      <h1>Chính sách Quyền riêng tư</h1>
      <p>Trang web storeios.net tôn trọng quyền riêng tư của người dùng. Chúng tôi sử dụng cookie và các công nghệ tương tự để phân tích lưu lượng, cá nhân hoá nội dung và hiển thị quảng cáo.</p>
      <h2>Cookie và quảng cáo</h2>
      <p>Chúng tôi hợp tác với các đối tác quảng cáo, bao gồm Google AdSense và Ezoic. Các đối tác có thể sử dụng cookie, web beacon để phân phát quảng cáo phù hợp.</p>
      <ul>
        <li>Chính sách về cách Google sử dụng dữ liệu: <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noreferrer">policies.google.com/technologies/partner-sites</a></li>
        <li>Trang quyền riêng tư do Ezoic cung cấp cho domain này: <a href="https://g.ezoic.net/privacy/storeios.net" target="_blank" rel="noreferrer">g.ezoic.net/privacy/storeios.net</a></li>
      </ul>
      <h2>Quyền của bạn</h2>
      <p>Bạn có thể quản lý tuỳ chọn đồng ý cookie thông qua banner/biểu mẫu đồng ý hiển thị trên trang.</p>
      <h2>Liên hệ</h2>
      <p>Nếu có câu hỏi về chính sách, vui lòng liên hệ: contact@storeios.net.</p>
      <p>Cập nhật lần cuối: {new Date().toISOString().slice(0,10)}</p>
    </main>
  );
}