console.log("index.js is being loaded");

import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

console.log("Imports completed in index.js, Store object:", Store);

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
      console.log("Store object before authentication:", Store);
      console.log("authenticate function:", Store.authenticate);
      let user;
      try {
        user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
        console.log("Authentication result:", user);
      } catch (authError) {
        console.error("Authentication error:", authError);
        return new Response(JSON.stringify({ error: `Authentication failed: ${authError.message}`, stack: authError.stack }), { status: 500, headers });
      }

      if (user._state !== "success") {
        return new Response(JSON.stringify({ error: `Authentication failed: ${user.customerMessage || 'Unknown error'}` }), { status: 401, headers });
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
        return new Response(JSON.stringify({ error: `Download failed: ${downloadError.message}`, stack: downloadError.stack }), { status: 500, headers });
      }

      if (app._state !== "success") {
        return new Response(JSON.stringify({ error: `Download failed: ${app.customerMessage || 'Unknown error'}` }), { status: 400, headers });
      }
      console.log("Download successful");

      const songList0 = app?.songList[0];
      if (!songList0) {
        throw new Error("No song list found in the app data");
      }
      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      console.log("Creating SignatureClient...");
      const signatureClient = new SignatureClient(songList0, APPLE_ID);

      console.log("Loading buffer...");
      await signatureClient.loadBuffer(await (await fetch(songList0.URL)).arrayBuffer());

      console.log("Appending metadata...");
      signatureClient.appendMetadata();

      console.log("Appending signature...");
      await signatureClient.appendSignature();

      console.log("Generating buffer...");
      const buffer = await signatureClient.getBuffer();

      console.log("Uploading to R2...");
      await env.R2.put(fileName, buffer);

      const url = `${env.DOMAIN}/${fileName}`;
      console.log("Download URL:", url);

      return new Response(JSON.stringify({ url }), { headers });
    } catch (error) {
      console.error("Detailed error:", error);
      return new Response(JSON.stringify({ error: error.message, stack: error.stack }), { status: 500, headers });
    }
  },
};

console.log("index.js has been fully loaded");