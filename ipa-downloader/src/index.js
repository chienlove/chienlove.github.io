import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

export default {
  async fetch(request, env, ctx) {
    console.log("Nhận yêu cầu mới");

    // CORS handling
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
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

    const url = new URL(request.url);
    
    if (url.pathname === "/auth") {
      return handleAuth(request, env, headers);
    } else if (url.pathname === "/download") {
      return handleDownload(request, env, headers);
    } else {
      return new Response(JSON.stringify({ error: "Invalid endpoint" }), { status: 404, headers });
    }
  },
};

async function handleAuth(request, env, headers) {
  try {
    const { APPLE_ID, PASSWORD, CODE } = await request.json();

    if (!APPLE_ID || !PASSWORD) {
      throw new Error("Missing required fields");
    }

    const user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);

    if (user.needsMFA) {
      return new Response(JSON.stringify({ needsMFA: true }), { status: 200, headers });
    }
    if (user.error) {
      return new Response(JSON.stringify({ error: user.error }), { status: 401, headers });
    }

    // Tạo token đơn giản (trong thực tế, bạn nên sử dụng một phương pháp bảo mật hơn)
    const token = btoa(JSON.stringify(user));

    return new Response(JSON.stringify({ token }), { status: 200, headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}

async function handleDownload(request, env, headers) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization token');
    }

    const token = authHeader.split(' ')[1];
    const user = JSON.parse(atob(token));

    const { APPID, appVerId } = await request.json();

    if (!APPID || !appVerId) {
      throw new Error("Missing required fields");
    }

    const app = await Store.download(APPID, appVerId, user);
    if (app.error) {
      throw new Error(app.error);
    }

    const songList0 = app?.songList[0];
    if (!songList0) {
      throw new Error("No song list found in the app data");
    }

    const uniqueString = crypto.randomUUID();
    const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

    const signatureClient = new SignatureClient(songList0, user.appleId);
    await signatureClient.loadBuffer(await (await fetch(songList0.URL)).arrayBuffer());
    signatureClient.appendMetadata();
    await signatureClient.appendSignature();
    const buffer = await signatureClient.getBuffer();

    await env.R2.put(fileName, buffer);

    const url = `${env.DOMAIN}/${fileName}`;

    return new Response(JSON.stringify({ url }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  }
}