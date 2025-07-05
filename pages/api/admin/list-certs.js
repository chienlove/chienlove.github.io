import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { data, error } = await supabase
      .from('certificates')
      .select('id, name, updated_at');

    if (error) throw error;

    res.status(200).json({ certs: data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}