// File: pages/api/admin/add-view.js
import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(req, res) {
  // Chỉ cho phép POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  // Validate input
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing app ID' 
    });
  }

  try {
    // Bước 1: Lấy số lượng view hiện tại từ Database bằng quyền Admin
    const { data: currentApp, error: selectError } = await supabaseAdmin
      .from('apps')
      .select('views')
      .eq('id', id)
      .single();

    if (selectError) {
      console.error('Supabase select error:', selectError);
      throw selectError;
    }

    // Bước 2: Cộng dồn và ép Supabase trả về giá trị mới ngay lập tức sau khi cập nhật
    const { data: updatedApp, error: updateError } = await supabaseAdmin
      .from('apps')
      .update({ 
        views: (currentApp?.views || 0) + 1 
      })
      .eq('id', id)
      .select('views') // 💡 Lấy ra trường views sau khi update
      .single();       // 💡 Đảm bảo trả về 1 đối tượng duy nhất thay vì mảng

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    // Bước 3: Trả về kết quả kèm theo con số view real-time chính xác nhất
    return res.status(200).json({ 
      success: true,
      views: updatedApp?.views ?? 0
    });

  } catch (error) {
    console.error('Server error:', error.message);
    return res.status(500).json({ 
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
}