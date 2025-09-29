// pages/api/upload-avatar.js
export const config = { api: { bodyParser: false } };

import { supabaseAdmin } from '../../lib/supabase-admin';

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (d) => chunks.push(d));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const uid = req.headers['x-user-uid'];
    const filename = req.headers['x-file-name'];
    const contentType = req.headers['x-content-type'] || 'application/octet-stream';
    if (!uid || !filename) return res.status(400).json({ error: 'Missing uid or filename' });

    const buf = await readRaw(req);
    const path = `${uid}/${Date.now()}_${decodeURIComponent(filename)}`;

    const { error } = await supabaseAdmin
      .storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'avatars')
      .upload(path, buf, { contentType, upsert: true });

    if (error) return res.status(500).json({ error: error.message });

    const { data: pub } = supabaseAdmin
      .storage
      .from(process.env.SUPABASE_STORAGE_BUCKET || 'avatars')
      .getPublicUrl(path);

    return res.status(200).json({ url: pub?.publicUrl || null, path });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}