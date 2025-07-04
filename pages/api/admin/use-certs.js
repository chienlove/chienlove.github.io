export const config = {
  api: {
    bodyParser: true, // Đảm bảo có thể đọc JSON từ req.body
  },
};

import { createClient } from '@supabase/supabase-js';

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

    // Lấy cert từ Supabase theo name
    const { data: cert, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !cert) {
      console.error("❌ Không tìm thấy chứng chỉ:", error?.message || 'not found');
      return res.status(404).json({ message: 'Không tìm thấy chứng chỉ.' });
    }

    console.log("✅ [use-certs] Cert found:", cert.name);

    // Gửi GitHub Action
    const trigger = await fetch(`https://api.github.com/repos/chienlove/chienlove.github.io/actions/workflows/sign-ipa.yml/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GH_PAT}`,
        Accept: 'application/vnd.github+json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          tag,
          identifier
        }
      })
    });

    if (!trigger.ok) {
      const text = await trigger.text();
      console.error("❌ GitHub trigger lỗi:", text);
      return res.status(500).json({ message: 'GitHub Action lỗi: ' + text });
    }

    return res.status(200).json({ message: '✅ Đã gửi yêu cầu ký IPA.' });

  } catch (err) {
    console.error("❌ Lỗi server:", err);
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
}