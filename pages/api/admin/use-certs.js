export const config = {
  api: {
    bodyParser: true,
  },
};

import { createClient } from '@supabase/supabase-js';

// Kiểm tra biến môi trường
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing Supabase configuration");
  throw new Error("Supabase configuration missing");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("📥 [use-certs] METHOD:", req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, tag, identifier } = req.body;
    console.log("📦 [use-certs] BODY:", { name, tag, identifier });

    if (!name || !tag || !identifier) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    // Kiểm tra GitHub PAT
    if (!process.env.GH_PAT) {
      console.error("❌ Missing GitHub PAT");
      return res.status(500).json({ message: 'Cấu hình server không đầy đủ' });
    }

    // Truy vấn Supabase
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      console.error("❌ Supabase error:", error);
      return res.status(500).json({ 
        message: 'Lỗi truy vấn database',
        details: error.message 
      });
    }

    if (!cert) {
      return res.status(404).json({ message: 'Không tìm thấy chứng chỉ.' });
    }

    console.log("✅ [use-certs] Cert found:", cert.name);

    // Gọi GitHub API
    const response = await fetch(
      `https://api.github.com/repos/chienlove/chienlove.github.io/actions/workflows/sign-ipa.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.GH_PAT}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28'
        },
        body: JSON.stringify({
          ref: 'main',
          inputs: { tag, identifier }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("❌ GitHub error:", response.status, errorData);
      return res.status(500).json({
        message: 'GitHub Action failed',
        status: response.status,
        details: errorData
      });
    }

    return res.status(200).json({ message: '✅ Đã gửi yêu cầu ký IPA.' });

  } catch (err) {
    console.error("❌ Server error:", err);
    return res.status(500).json({ 
      message: err.message || 'Internal server error',
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}