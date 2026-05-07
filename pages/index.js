export default function ShutdownNotice() {
  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        :root { --bg-color: #000000; --text-main: #ffffff; --text-muted: #86868b; --card-bg: rgba(28, 28, 30, 0.6); --border-color: rgba(255, 255, 255, 0.08); }
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: var(--bg-color); color: var(--text-main); display: flex; justify-content: center; align-items: center; min-height: 100vh; background-image: radial-gradient(circle at 50% 0%, #1c1c20 0%, #000000 80%); }
        .container { max-width: 480px; padding: 40px 32px; text-align: center; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 28px; backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6); margin: 20px; animation: fadeIn 0.6s ease-out; }
        .icon { font-size: 56px; margin-bottom: 20px; filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.2)); }
        h1 { font-size: 24px; font-weight: 600; margin: 0 0 16px 0; letter-spacing: -0.5px; }
        p { font-size: 15px; line-height: 1.6; color: var(--text-muted); margin: 0 0 24px 0; }
        .domain-name { font-weight: 600; color: var(--text-main); }
        .footer { font-size: 13px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 24px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 400px) { .container { padding: 30px 20px; border-radius: 20px; } h1 { font-size: 22px; } }
      `}} />
      
      <div className="container">
        <div className="icon">🔌</div>
        <h1>Thông Báo Ngừng Hoạt Động</h1>
        <p>
          Chào các bạn,<br /><br />
          Để đảm bảo tuân thủ các quy định mới về pháp lý và tiêu chuẩn bảo mật hiện hành, <span className="domain-name">storeios.net</span> xin chính thức thông báo ngừng cung cấp dịch vụ kể từ thời điểm này.
        </p>
        <p>
          Quyết định này nhằm đảm bảo an toàn tối đa cho thiết bị cũng như dữ liệu cá nhân của người dùng. Toàn bộ tệp tin và cơ sở dữ liệu trên hệ thống máy chủ đều đã được xóa bỏ hoàn toàn.
        </p>
        <div className="footer">
          Cảm ơn các bạn đã luôn đồng hành và ủng hộ dự án trong suốt thời gian qua. Hẹn gặp lại ở những dự án công nghệ khác an toàn và hoàn thiện hơn!<br /><br />
          Trân trọng.
        </div>
      </div>
    </>
  );
}
