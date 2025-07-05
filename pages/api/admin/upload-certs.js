import { IncomingForm } from 'formidable';
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
    externalResolver: true
  }
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function readFile(file) {
  return fs.readFileSync(file.filepath);
}

async function removeOldFiles(existingCert) {
  if (!existingCert) return;

  try {
    const { data: oldCert } = await supabase
      .from('certificates')
      .select('p12_url, provision_url')
      .eq('id', existingCert.id)
      .single();

    if (oldCert) {
      const extractPath = (url) => url.split('/certificates/')[1];
      const filesToRemove = [
        extractPath(oldCert.p12_url),
        extractPath(oldCert.provision_url)
      ].filter(Boolean);

      if (filesToRemove.length > 0) {
        await supabase.storage.from('certificates').remove(filesToRemove);
        console.log('♻️ Đã xóa file cũ:', filesToRemove);
      }
    }
  } catch (error) {
    console.error('❌ Lỗi khi xóa file cũ:', error.message);
  }
}

export default async function handler(req, res) {
  console.log("📥 [upload-certs] Request method:", req.method);
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // 1. Parse form data
    const form = new IncomingForm({ 
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(new Error(`Lỗi phân tích form: ${err.message}`));
        else resolve({ fields, files });
      });
    });

    // 2. Validate input
    const certName = fields.name?.[0]?.trim();
    const password = fields.password?.[0]?.trim();
    
    if (!certName || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Thiếu thông tin bắt buộc (name hoặc password)" 
      });
    }

    if (!files.p12?.[0] || !files.provision?.[0]) {
      return res.status(400).json({ 
        success: false,
        message: "Thiếu file chứng chỉ (.p12 hoặc .mobileprovision)" 
      });
    }

    // 3. Check existing record
    console.log("🔍 Checking existing certificate...");
    const { data: existingCert, error: checkError } = await supabase
      .from('certificates')
      .select('id, p12_url, provision_url')
      .eq('name', certName)
      .maybeSingle();

    if (checkError) throw new Error(`Lỗi kiểm tra cert: ${checkError.message}`);

    // 4. Xóa file cũ nếu tồn tại
    await removeOldFiles(existingCert);

    // 5. Upload files to storage
    console.log("⬆️ Uploading files to storage...");
    const timestamp = Date.now();
    const p12Filename = `${certName}-${timestamp}.p12`;
    const provisionFilename = `${certName}-${timestamp}.mobileprovision`;

    const [p12Upload, provisionUpload] = await Promise.all([
      supabase.storage
        .from('certificates')
        .upload(p12Filename, readFile(files.p12[0]), {
          contentType: 'application/x-pkcs12',
          upsert: true
        }),
      
      supabase.storage
        .from('certificates')
        .upload(provisionFilename, readFile(files.provision[0]), {
          contentType: 'application/octet-stream',
          upsert: true
        })
    ]);

    if (p12Upload.error || provisionUpload.error) {
      throw new Error(
        `Lỗi upload: ${p12Upload.error?.message || provisionUpload.error?.message}`
      );
    }

    // 6. Get public URLs
    const p12Url = supabase.storage
      .from('certificates')
      .getPublicUrl(p12Upload.data.path).data.publicUrl;
    
    const provisionUrl = supabase.storage
      .from('certificates')
      .getPublicUrl(provisionUpload.data.path).data.publicUrl;

    // 7. Xử lý database
    console.log("💾 Saving to database...");
    let certData;
    if (existingCert) {
      // Cập nhật bản ghi cũ
      const { data, error } = await supabase
        .from('certificates')
        .update({
          p12_url: p12Url,
          provision_url: provisionUrl,
          password: password,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingCert.id)
        .select()
        .single();
      if (error) throw error;
      certData = data;
    } else {
      // Thêm bản ghi mới
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          name: certName,
          p12_url: p12Url,
          provision_url: provisionUrl,
          password: password
        })
        .select()
        .single();
      if (error) throw error;
      certData = data;
    }

    // 8. Response
    console.log("✅ Upload completed");
    res.status(200).json({
      success: true,
      message: existingCert 
        ? "Đã cập nhật chứng chỉ thành công!" 
        : "Đã tạo chứng chỉ mới thành công!",
      data: {
        id: certData.id,
        name: certData.name,
        p12_url: certData.p12_url,
        provision_url: certData.provision_url,
        updated_at: certData.updated_at
      }
    });

  } catch (error) {
    console.error("❌ Critical error:", error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : "Lỗi hệ thống, vui lòng thử lại",
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.stack 
      })
    });
  }
}