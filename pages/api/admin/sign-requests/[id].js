// pages/api/admin/sign-requests/[id].js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== 'DELETE') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!id) {
    return res.status(400).json({ message: 'Thiếu ID cần xoá' });
  }

  try {
    const { error } = await supabase
      .from('sign_requests')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return res.status(200).json({ message: 'Đã xoá yêu cầu thành công' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}