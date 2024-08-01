import { Store } from "./client.js";
import { SignatureClient } from "./Signature.js";

export default {
  async fetch(request, env, ctx) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const { APPLE_ID, PASSWORD, CODE, APPID, appVerId } = await request.json();

    try {
      const user = await Store.authenticate(APPLE_ID, PASSWORD, CODE);
      if (user._state !== "success") {
        throw new Error(user.customerMessage);
      }

      const app = await Store.download(APPID, appVerId, user);
      if (app._state !== "success") {
        throw new Error(app.customerMessage);
      }

      const songList0 = app?.songList[0];
      const uniqueString = crypto.randomUUID();
      const fileName = `${songList0.metadata.bundleDisplayName}_${songList0.metadata.bundleShortVersionString}_${uniqueString}.ipa`;

      // Download IPA file
      const response = await fetch(songList0.URL);
      const arrayBuffer = await response.arrayBuffer();

      // Sign IPA
      const sigClient = new SignatureClient(songList0, APPLE_ID);
      await sigClient.loadBuffer(arrayBuffer);
      await sigClient.appendMetadata().appendSignature();
      const signedBuffer = await sigClient.getBuffer();

      // Upload to Cloudflare R2
      await env.MY_BUCKET.put(fileName, signedBuffer);

      // Generate temporary URL for download
      const url = await env.MY_BUCKET.createSignedUrl({
        bucket: env.MY_BUCKET.name,
        key: fileName,
        expirationSeconds: 60 * 15, // 15 minutes
      });

      return new Response(JSON.stringify({ url }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  },
};