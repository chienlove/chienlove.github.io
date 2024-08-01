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
      const user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
      if (user._state !== "success") {
        throw new Error(`Authentication failed: ${user.customerMessage}`);
      }
      console.log("Authentication successful");

      // Download
      console.log("Downloading app...");
      const app = await Store.download(APPID, appVerId, user);
      if (app._state !== "success") {
        throw new Error(`Download failed: ${app.customerMessage}`);
      }
      console.log("Download successful");

      const songList0 = app?.songList[0];
      if (!songList0) {
        throw new Error("No song list found in the app data");
      }
      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      // Download IPA file
      console.log("Downloading IPA file...");
      const response = await fetch(songList0.URL);
      const arrayBuffer = await response.arrayBuffer();
      console.log("IPA file downloaded");

      // Sign IPA
      console.log("Signing IPA...");
      const sigClient = new SignatureClient(songList0, APPLE_ID);
      await sigClient.loadBuffer(arrayBuffer);
      await sigClient.appendMetadata().appendSignature();
      const signedBuffer = await sigClient.getBuffer();
      console.log("IPA signed successfully");

      // Upload to Cloudflare R2
      console.log("Uploading to R2...");
      await env.MY_BUCKET.put(fileName, signedBuffer);
      console.log("Upload to R2 successful");

      // Generate temporary URL for download
      console.log("Generating signed URL...");
      const url = await env.MY_BUCKET.createSignedUrl({
        bucket: env.MY_BUCKET.name,
        key: fileName,
        expirationSeconds: 60 * 15, // 15 minutes
      });
      console.log("Signed URL created:", url);

      return new Response(JSON.stringify({ url }), { headers });
    } catch (error) {
      console.error("Detailed error:", error);
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers });
    }
  },
};