import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });

  const { error } = await supabase.rpc('increment_download', { app_id: id });

  if (error) {
    console.error('Error incrementing download:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tăng lượt tải' });
  }

  return res.status(200).json({ success: true });
}