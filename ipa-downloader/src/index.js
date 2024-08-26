import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

export default {
  async fetch(request, env, ctx) {
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
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    try {
      const { APPLE_ID, PASSWORD, CODE, APPID, appVerId } = await request.json();

      if (!APPLE_ID || !PASSWORD || !APPID || !appVerId) {
        throw new Error("Missing required fields");
      }

      // Authenticate
      const user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
      if (user._state !== "success") {
        return new Response(JSON.stringify({ error: "Authentication failed" }), { status: 401, headers });
      }

      // Download
      const app = await Store.download(APPID, appVerId, user);
      if (app._state !== "success") {
        return new Response(JSON.stringify({ error: "Download failed" }), { status: 400, headers });
      }

      const songList0 = app?.songList[0];
      if (!songList0) {
        throw new Error("No song list found in the app data");
      }

      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      const signatureClient = new SignatureClient(songList0, APPLE_ID);
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
  },
};