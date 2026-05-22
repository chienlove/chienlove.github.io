// File: pages/api/admin/add-view.js
import { supabaseAdmin } from '../../../lib/supabase-admin'; // Đảm bảo đúng đường dẫn tới file supabase-admin của bạn

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
    // Bước 1: Lấy số lượng view hiện tại bằng supabaseAdmin (bỏ qua RLS)
    const { data: currentApp, error: selectError } = await supabaseAdmin
      .from('apps')
      .select('views')
      .eq('id', id)
      .single();

    if (selectError) {
      console.error('Supabase select error:', selectError);
      throw selectError;
    }

    // Bước 2: Cộng dồn và cập nhật trực tiếp vào DB bằng quyền Admin
    const { error: updateError } = await supabaseAdmin
      .from('apps')
      .update({ 
        views: (currentApp?.views || 0) + 1 
      })
      .eq('id', id);

    if (updateError) {
      console.error('Supabase update error:', updateError);
      throw updateError;
    }

    return res.status(200).json({ 
      success: true 
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