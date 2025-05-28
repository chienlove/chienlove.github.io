import { sql } from '@vercel/postgres';
import { uploadImage } from '@/lib/firebase';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { name, icon, author, description, testflight_link, category_id } = req.body;
    const iconUrl = await uploadImage(icon);
    
    await sql`
      INSERT INTO apps (name, icon_url, author, description, testflight_link, category_id)
      VALUES (${name}, ${iconUrl}, ${author}, ${description}, ${testflight_link}, ${category_id})
    `;
    res.status(200).json({ success: true });
  }
}