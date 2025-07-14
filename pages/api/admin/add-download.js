import { supabase } from '@/lib/supabase';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: 'Thiếu ID' });

  try {
    // 1. Lấy giá trị hiện tại từ database
    const { data: currentApp, error: fetchError } = await supabase
      .from('apps')
      .select('downloads')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // 2. Xử lý NULL → 0
    const currentDownloads = currentApp?.downloads ?? 0;

    // 3. Cập nhật giá trị mới
    const { error: updateError } = await supabase
      .from('apps')
      .update({ downloads: currentDownloads + 1 })
      .eq('id', id);

    if (updateError) throw updateError;

    // 4. Trả về kết quả
    return res.status(200).json({
      success: true,
      downloads: currentDownloads + 1,
    });

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
}