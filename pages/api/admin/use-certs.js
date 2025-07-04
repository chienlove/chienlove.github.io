// pages/api/admin/use-certs.js
export const config = {
  api: { bodyParser: true }
};

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  console.log("📥 CALLED use-certs.js METHOD:", req.method);

  if (req.method !== 'POST') {
    console.log("❌ Wrong method:", req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, tag, identifier } = req.body;
    console.log("📦 Body received:", { name, tag, identifier });

    if (!name || !tag || !identifier) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc.' });
    }

    const { data, error } = await supabase
      .from('certificates')
      .select('*')
      .eq('name', name)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Không tìm thấy chứng chỉ.' });
    }

    const trigger = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/actions/workflows/sign-ipa.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GH_PAT}`,
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { tag, identifier }
      })
    });

    if (!trigger.ok) {
      const msg = await trigger.text();
      throw new Error("GitHub Action lỗi: " + msg);
    }

    res.status(200).json({ message: '✅ Đã gửi yêu cầu ký IPA.' });
  } catch (error) {
    console.error("❌ use-certs error:", error);
    res.status(500).json({ message: error.message });
  }
}