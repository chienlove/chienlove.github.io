import { put } from '@vercel/blob';
import { getSession } from 'next-auth/react';
import { IncomingForm } from 'formidable';

export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const session = await getSession({ req });
  if (!session?.user?.isAdmin) return res.status(403).json({ message: 'Unauthorized' });

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    // Upload lên Vercel Blob
    const [p12Blob, provisionBlob] = await Promise.all([
      put(`certs/${Date.now()}.p12`, files.p12[0], { access: 'public' }),
      put(`provisions/${Date.now()}.mobileprovision`, files.provision[0], { access: 'public' })
    ]);

    // Lưu thông tin vào biến môi trường (hoặc database)
    process.env.SIGNING_P12_URL = p12Blob.url;
    process.env.PROVISION_URL = provisionBlob.url;
    process.env.SIGNING_PASSWORD = fields.password[0];

    res.status(200).json({ 
      message: 'Chứng chỉ đã được lưu thành công',
      p12Url: p12Blob.url,
      provisionUrl: provisionBlob.url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
}