import { put } from '@vercel/blob';
import { IncomingForm } from 'formidable';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm();
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    const timestamp = Date.now();
    const [p12Blob, provisionBlob] = await Promise.all([
      put(`certs/${timestamp}.p12`, files.p12[0], { access: 'public' }),
      put(`provisions/${timestamp}.mobileprovision`, files.provision[0], { access: 'public' })
    ]);

    const { error } = await supabase
      .from('certificates')
      .upsert({
        id: 1,
        p12_url: p12Blob.url,
        provision_url: provisionBlob.url,
        password: fields.password[0],
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await fetch('https://api.github.com/repos/your-username/your-repo/actions/workflows/sign-ipa.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GH_PAT}`,
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          tag: fields.tag[0],
          identifier: fields.identifier[0]
        }
      })
    });

    res.status(200).json({
      message: 'Chứng chỉ đã được lưu và ký IPA thành công!',
      p12Url: p12Blob.url,
      provisionUrl: provisionBlob.url
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
}