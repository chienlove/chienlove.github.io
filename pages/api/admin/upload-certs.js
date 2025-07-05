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

async function cleanupOldFiles(existingCert) {
  if (!existingCert) return;

  try {
    const { data: oldCert } = await supabase
      .from('certificates')
      .select('p12_url, provision_url')
      .eq('id', existingCert.id)
      .single();

    if (oldCert) {
      const extractFilename = (url) => {
        try {
          return new URL(url).pathname.split('/').pop();
        } catch {
          return url.split('/certificates/')[1];
        }
      };

      const filesToRemove = [
        extractFilename(oldCert.p12_url),
        extractFilename(oldCert.provision_url)
      ].filter(Boolean);

      if (filesToRemove.length > 0) {
        await supabase.storage.from('certificates').remove(filesToRemove);
        console.log('♻️ Đã xóa file cũ:', filesToRemove);
      }
    }
  } catch (error) {
    console.error('⚠️ Lỗi khi dọn dẹp file cũ:', error.message);
  }
}

export default async function handler(req, res) {
  console.log("📥 [upload-certs] Request method:", req.method);
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Chỉ hỗ trợ phương thức POST' 
    });
  }

  try {
    // 1. Parse form data
    const form = new IncomingForm({ 
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB
    });

    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('❌ Parse form error:', err);
          reject(new Error('Dữ liệu form không hợp lệ'));
        } else {
          resolve({ fields, files });
        }
      });
    });

    // 2. Validate input
    const certName = fields.name?.[0]?.trim();
    const password = fields.password?.[0]?.trim();
    
    if (!certName || !password) {
      return res.status(400).json({ 
        success: false,
        message: "Vui lòng cung cấp đủ tên chứng chỉ và mật khẩu" 
      });
    }

    if (!files.p12?.[0] || !files.provision?.[0]) {
      return res.status(400).json({ 
        success: false,
        message: "Thiếu file chứng chỉ (.p12 hoặc .mobileprovision)" 
      });
    }

    // 3. Check existing record
    console.log("🔍 Kiểm tra chứng chỉ tồn tại...");
    const { data: existingCert, error: checkError } = await supabase
      .from('certificates')
      .select('id, p12_url, provision_url')
      .eq('name', certName)
      .maybeSingle();

    if (checkError) {
      throw new Error(`Lỗi kiểm tra chứng chỉ: ${checkError.message}`);
    }

    // 4. Dọn dẹp file cũ nếu tồn tại
    await cleanupOldFiles(existingCert);

    // 5. Upload files với tên mới
    console.log("⬆️ Đang tải lên storage...");
    const timestamp = Date.now();
    const filePrefix = `${certName.replace(/\s+/g, '-')}-${timestamp}`;
    const p12Filename = `${filePrefix}.p12`;
    const provisionFilename = `${filePrefix}.mobileprovision`;

    const [p12Result, provisionResult] = await Promise.all([
      supabase.storage
        .from('certificates')
        .upload(p12Filename, readFile(files.p12[0]), {
          contentType: 'application/x-pkcs12',
          upsert: false
        }),
      
      supabase.storage
        .from('certificates')
        .upload(provisionFilename, readFile(files.provision[0]), {
          contentType: 'application/octet-stream',
          upsert: false
        })
    ]);

    // Xử lý lỗi upload
    if (p12Result.error || provisionResult.error) {
      // Rollback: Xóa file đã upload nếu có lỗi
      const uploadedFiles = [];
      if (p12Result.data) uploadedFiles.push(p12Filename);
      if (provisionResult.data) uploadedFiles.push(provisionFilename);
      
      if (uploadedFiles.length > 0) {
        await supabase.storage.from('certificates').remove(uploadedFiles);
      }

      throw new Error(
        `Lỗi tải lên: ${p12Result.error?.message || provisionResult.error?.message}`
      );
    }

    // 6. Lấy public URLs
    const p12Url = supabase.storage
      .from('certificates')
      .getPublicUrl(p12Result.data.path).data.publicUrl;
    
    const provisionUrl = supabase.storage
      .from('certificates')
      .getPublicUrl(provisionResult.data.path).data.publicUrl;

    // 7. Xử lý database (QUAN TRỌNG)
    console.log("💾 Đang lưu vào database...");
    let certData;
    
    if (existingCert) {
      // CẬP NHẬT bản ghi hiện có
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
      // THÊM MỚI (không chỉ định ID)
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

    // 8. Trả về kết quả
    console.log("✅ Hoàn thành!");
    res.status(200).json({
      success: true,
      message: existingCert 
        ? "Đã cập nhật chứng chỉ thành công" 
        : "Đã thêm chứng chỉ mới thành công",
      data: {
        id: certData.id,
        name: certData.name,
        p12_url: certData.p12_url,
        provision_url: certData.provision_url,
        updated_at: certData.updated_at
      }
    });

  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng:", error);
    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : "Đã xảy ra lỗi hệ thống",
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack
      })
    });
  }
}