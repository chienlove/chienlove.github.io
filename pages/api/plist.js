import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const secret = process.env.JWT_SECRET;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !token) {
    return res.status(400).send('Missing id or token');
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.id !== id) return res.status(403).send('Invalid token');

    // 🔍 Truy vấn Supabase để lấy slug từ id
    const { data: app, error } = await supabase
      .from('apps')
      .select('slug')
      .eq('id', id)
      .single();

    if (error || !app?.slug) {
      return res.status(404).send('App not found');
    }

    const filePath = path.join(process.cwd(), 'secure/plist', `${app.slug}.plist`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Plist not found');
    }

    res.setHeader('Content-Type', 'application/xml');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(403).send('Expired or invalid token');
  }
}