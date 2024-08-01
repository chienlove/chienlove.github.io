import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

export default {
  async fetch(request, env, ctx) {
    console.log("Worker received request");

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
      console.log("Method not allowed:", request.method);
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    try {
      const { APPLE_ID, PASSWORD, CODE, APPID, appVerId } = await request.json();
      console.log("Received data:", { APPLE_ID, APPID, appVerId });

      // Kiểm tra nếu các trường bắt buộc bị thiếu
      if (!APPLE_ID || !PASSWORD || !APPID) {
        throw new Error("Missing required fields: APPLE_ID, PASSWORD, and APPID are required.");
      }

      // Authenticate
      console.log("Authenticating...");
      let user;
      try {
        user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
        console.log("Authentication result:", user);
      } catch (authError) {
        console.error("Authentication error:", authError);
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (user._state !== "success") {
        throw new Error(`Authentication failed: ${user.customerMessage || 'Unknown error'}`);
      }
      console.log("Authentication successful");

      // Download
      console.log("Downloading app...");
      let app;
      try {
        app = await Store.download(APPID, appVerId, user);
        console.log("Download result:", app);
      } catch (downloadError) {
        console.error("Download error:", downloadError);
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      if (app._state !== "success") {
        throw new Error(`Download failed: ${app.customerMessage || 'Unknown error'}`);
      }
      console.log("Download successful");

      const songList0 = app?.songList[0];
      if (!songList0) {
        throw new Error("No song list found in the app data");
      }
      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      // ... Rest of the code remains the same ...

      return new Response(JSON.stringify({ url }), { headers });
    } catch (error) {
      console.error("Detailed error:", error);
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers });
    }
  },
};