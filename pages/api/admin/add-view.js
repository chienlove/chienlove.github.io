import { supabase } from '../../../lib/supabase';

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
    // Cách 1: Dùng RPC function (nếu đã tạo trong Supabase)
    const { error } = await supabase
      .rpc('increment_views', { 
        app_id: id 
      });

    // Cách 2: Hoặc update trực tiếp
    // const { data: currentApp } = await supabase
    //   .from('apps')
    //   .select('views')
    //   .eq('id', id)
    //   .single();
    //
    // const { error } = await supabase
    //   .from('apps')
    //   .update({ 
    //     views: (currentApp?.views || 0) + 1 
    //   })
    //   .eq('id', id);

    if (error) {
      console.error('Supabase error:', error);
      throw error;
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