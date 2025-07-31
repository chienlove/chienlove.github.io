import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { file } = req.query;

  // Validate input
  if (!file || !/^[\w-]+\.plist$/.test(file)) {
    return res.status(400).send('Invalid plist filename');
  }

  // Optional: Verify admin token if needed
  const token = req.headers['authorization']?.split(' ')[1];
  if (token) {
    try {
      const { data: { user } } = await supabase.auth.getUser(token);
      if (!user) return res.status(403).send('Invalid token');
    } catch (e) {
      return res.status(403).send('Invalid token');
    }
  }

  // Serve plist file
  const plistPath = path.join(process.cwd(), 'secure/plist', file);
  
  try {
    if (!fs.existsSync(plistPath)) {
      return res.status(404).send('Plist file not found');
    }

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    fs.createReadStream(plistPath).pipe(res);
  } catch (error) {
    console.error('Error serving plist:', error);
    res.status(500).send('Internal server error');
  }
}