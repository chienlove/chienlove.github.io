import { IncomingForm } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function readFile(file) {
  return fs.readFileSync(file.filepath);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ keepExtensions: true });
      form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
    });

    const timestamp = Date.now();
    const p12Buffer = readFile(files.p12[0]);
    const provisionBuffer = readFile(files.provision[0]);

    const { data: p12Data, error: p12Error } = await supabase.storage
      .from('certificates')
      .upload(`cert-${timestamp}.p12`, p12Buffer, {
        contentType: 'application/x-pkcs12',
        upsert: true
      });

    const { data: provisionData, error: provisionError } = await supabase.storage
      .from('certificates')
      .upload(`profile-${timestamp}.mobileprovision`, provisionBuffer, {
        contentType: 'application/octet-stream',
        upsert: true
      });

    if (p12Error || provisionError) {
      throw new Error('Lỗi khi upload lên Supabase Storage');
    }

    const p12Url = supabase.storage.from('certificates').getPublicUrl(p12Data.path).data.publicUrl;
    const provisionUrl = supabase.storage.from('certificates').getPublicUrl(provisionData.path).data.publicUrl;

    const { error } = await supabase
      .from('certificates')
      .upsert({
        id: 1,
        p12_url: p12Url,
        provision_url: provisionUrl,
        password: fields.password[0],
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/actions/workflows/sign-ipa.yml/dispatches', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GH_PAT}`,
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify({
        ref: 'master',
        inputs: {
          tag: fields.tag[0],
          identifier: fields.identifier[0]
        }
      })
    });

    res.status(200).json({
      message: 'Chứng chỉ đã được lưu và ký IPA thành công!',
      p12Url,
      provisionUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
}