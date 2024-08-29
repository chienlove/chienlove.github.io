import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

// Sử dụng một đối tượng để lưu trữ thông tin phiên
const sessions = {};

export default {
  async fetch(request, env, ctx) {
    console.log("Nhận yêu cầu mới");

    // CORS handling
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
      const { APPLE_ID, PASSWORD, CODE, APPID, appVerId, sessionId } = await request.json();

      if (!APPLE_ID || !PASSWORD || !APPID || !appVerId) {
        console.error("Thiếu trường bắt buộc");
        throw new Error("Missing required fields");
      }

      let user;
      if (sessionId && sessions[sessionId]) {
        console.log("Sử dụng phiên hiện có");
        user = sessions[sessionId];
      } else {
        console.log("Bắt đầu xác thực mới");
        user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);

        if (user.needsMFA) {
          const newSessionId = generateSessionId();
          sessions[newSessionId] = { APPLE_ID, PASSWORD };
          return new Response(JSON.stringify({ needsMFA: true, sessionId: newSessionId }), { status: 200, headers });
        }

        if (user.error) {
          console.error("Xác thực thất bại:", user.error);
          return new Response(JSON.stringify({ error: user.error, details: user.details }), { status: 401, headers });
        }

        // Lưu thông tin xác thực vào phiên
        const newSessionId = generateSessionId();
        sessions[newSessionId] = user;
        user.sessionId = newSessionId;
      }

      console.log("Xác thực thành công, bắt đầu tải xuống");
      const app = await Store.download(APPID, appVerId, user);
      console.log("Kết quả tải xuống:", app);
      if (app.error) {
        console.error("Tải xuống thất bại:", app.error);
        return new Response(JSON.stringify({ error: app.error, details: app.details }), { status: 400, headers });
      }

      const songList0 = app?.songList[0];
      if (!songList0) {
        console.error("Không tìm thấy danh sách bài hát trong dữ liệu ứng dụng");
        throw new Error("No song list found in the app data");
      }

      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      console.log("Bắt đầu xử lý chữ ký");
      const signatureClient = new SignatureClient(songList0, APPLE_ID);
      await signatureClient.loadBuffer(await (await fetch(songList0.URL)).arrayBuffer());
      signatureClient.appendMetadata();
      await signatureClient.appendSignature();
      const buffer = await signatureClient.getBuffer();

      console.log("Lưu file vào R2");
      await env.R2.put(fileName, buffer);

      const url = `${env.DOMAIN}/${fileName}`;
      console.log("URL tải xuống:", url);

      return new Response(JSON.stringify({ url, sessionId: user.sessionId }), { headers });
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

function generateSessionId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}