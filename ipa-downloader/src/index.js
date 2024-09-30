import { Store } from "./client.js";

export default {
  async fetch(request, env, ctx) {
    console.log("Nhận yêu cầu mới");

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const headers = {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json",
    };

    if (request.method !== "POST") {
      console.log("Phương thức không được phép:", request.method);
      return new Response(JSON.stringify({ error: "Method Not Allowed" }), { status: 405, headers });
    }

    try {
      console.log("Bắt đầu xử lý yêu cầu POST");
      const { APPLE_ID, PASSWORD, CODE, APPID, appVerId, scnt, xAppleSessionToken } = await request.json();

      if (!APPLE_ID || (!PASSWORD && !CODE) || !APPID || !appVerId) {
        console.error("Thiếu trường bắt buộc");
        throw new Error("Missing required fields");
      }

      console.log("Bắt đầu xác thực");
      let user;
      if (CODE && scnt && xAppleSessionToken) {
        try {
          user = await Store.handleMFA(APPLE_ID, CODE, scnt, xAppleSessionToken);
        } catch (mfaError) {
          console.error("MFA error:", mfaError);
          return new Response(JSON.stringify({ error: mfaError.message }), { status: 401, headers });
        }
      } else {
        user = await Store.authenticate(APPLE_ID, PASSWORD);
      }

      console.log("Kết quả xác thực:", JSON.stringify(user));

      if (!user) {
        console.error("Xác thực thất bại: User không được trả về");
        return new Response(JSON.stringify({ error: "Authentication failed", details: "No user returned" }), { status: 401, headers });
      }

      if (user.needsMFA) {
        console.log("MFA được yêu cầu. Loại MFA:", user.authType);
        return new Response(JSON.stringify({
          needsMFA: true,
          authType: user.authType,
          scnt: user.scnt,
          xAppleSessionToken: user.xAppleSessionToken
        }), { status: 200, headers });
      }

      if (user.error) {
        console.error("Xác thực thất bại:", user.error);
        return new Response(JSON.stringify({ error: user.error, details: user.details }), { status: 401, headers });
      }

      if (user._state !== 'success') {
        console.error("Xác thực không thành công:", JSON.stringify(user));
        return new Response(JSON.stringify({ error: "Xác thực không thành công", details: user }), { status: 401, headers });
      }

      console.log("Xác thực thành công, bắt đầu tải xuống");
      const app = await Store.download(APPID, appVerId, user);
      console.log("Kết quả tải xuống:", JSON.stringify(app));

      if (app.error) {
        console.error("Tải xuống thất bại:", app.error);
        return new Response(JSON.stringify({ error: app.error, details: app.details }), { status: 400, headers });
      }

      const uniqueString = crypto.randomUUID();
      const fileName = `${app.metadata.bundleDisplayName}_${app.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      console.log("Lưu file vào R2");
      await env.R2.put(fileName, app.buffer);

      const url = `${env.DOMAIN}/${fileName}`;
      console.log("URL tải xuống:", url);

      return new Response(JSON.stringify({ url }), { headers });
    } catch (error) {
      console.error("Lỗi chi tiết:", error);
      return new Response(JSON.stringify({ 
        error: error.message, 
        stack: error.stack,
        name: error.name,
        cause: error.cause
      }), { status: 500, headers });
    }
  },
};