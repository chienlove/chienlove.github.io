import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id, ipa_name } = req.query;

  if (!id || !ipa_name) {
    return res.status(400).json({ 
      error: 'Thiếu tham số id hoặc ipa_name' 
    });
  }

  try {
    // Tạo token với tên IPA gốc (giữ nguyên case và ký tự đặc biệt)
    const token = jwt.sign(
      {
        id,
        ipa_name: ipa_name // Giữ nguyên tên gốc
      }, 
      secret, 
      { expiresIn: '5m' }
    );

    // Tạo URL cài đặt
    const installUrl = `itms-services://?action=download-manifest&url=${
      encodeURIComponent(`https://storeios.net/api/plist?ipa_name=${ipa_name}&token=${token}`)
    }`;

    res.status(200).json({ 
      installUrl,
      ipa_name: ipa_name // Trả về để debug
    });

  } catch (err) {
    console.error('Lỗi tạo token:', err);
    res.status(500).json({ 
      error: 'Lỗi server khi tạo token' 
    });
  }
}