import { supabase } from '../../lib/supabase';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });

  // Lấy số lượt tải hiện tại trước khi cập nhật
  const { data: currentData } = await supabase
    .from('apps')
    .select('downloads')
    .eq('id', id)
    .single();

  // Tăng lượt tải
  const { error } = await supabase.rpc('increment_download', { app_id: id });

  if (error) {
    console.error('Error incrementing download:', error);
    return res.status(500).json({ success: false, message: 'Lỗi tăng lượt tải' });
  }

  // Trả về số lượt tải mới (current + 1)
  return res.status(200).json({ 
    success: true, 
    downloads: (currentData?.downloads || 0) + 1 
  });
}