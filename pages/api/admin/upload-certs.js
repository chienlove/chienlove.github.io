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

    const certName = fields.name?.[0]?.trim();
    if (!certName) return res.status(400).json({ message: "Thiếu tên chứng chỉ (name)" });

    // Check if file exists in storage
    const checkP12 = await supabase.storage.from('certificates').list('', {
      search: `${certName}.p12`
    });
    if (checkP12.data?.some(f => f.name === `${certName}.p12`)) {
      return res.status(409).json({ message: `Cert tên '${certName}' đã tồn tại.` });
    }

    const p12Buffer = readFile(files.p12[0]);
    const provisionBuffer = readFile(files.provision[0]);

    const { data: p12Data, error: p12Error } = await supabase.storage
      .from('certificates')
      .upload(`${certName}.p12`, p12Buffer, {
        contentType: 'application/x-pkcs12',
        upsert: false
      });

    const { data: provisionData, error: provisionError } = await supabase.storage
      .from('certificates')
      .upload(`${certName}.mobileprovision`, provisionBuffer, {
        contentType: 'application/octet-stream',
        upsert: false
      });

    if (p12Error || provisionError) {
      throw new Error('Lỗi khi upload lên Supabase Storage');
    }

    const p12Url = supabase.storage.from('certificates').getPublicUrl(p12Data.path).data.publicUrl;
    const provisionUrl = supabase.storage.from('certificates').getPublicUrl(provisionData.path).data.publicUrl;

    const { error } = await supabase.from('certificates').insert({
      name: certName,
      p12_url: p12Url,
      provision_url: provisionUrl,
      password: fields.password[0],
      updated_at: new Date().toISOString()
    });

    if (error) throw error;

    res.status(200).json({
      message: 'Tải lên chứng chỉ mới thành công!',
      p12Url,
      provisionUrl
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message });
  }
}