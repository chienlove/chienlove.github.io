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

export default async function handler(req, res) {
  console.log("📥 [upload-certs] Request method:", req.method);
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      message: 'Method not allowed' 
    });
  }

  try {
    // 1. Parse form data
    const { fields, files } = await new Promise((resolve, reject) => {
      const form = new IncomingForm({ 
        keepExtensions: true,
        maxFileSize: 10 * 1024 * 1024 // 10MB
      });
      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error("❌ Form parse error:", err);
          reject(new Error("Lỗi phân tích form data"));
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
      .select('id')
      .eq('name', certName)
      .maybeSingle();

    if (checkError) {
      console.error("❌ Check existing error:", checkError);
      throw new Error("Lỗi kiểm tra chứng chỉ tồn tại");
    }

    // 4. Upload files to storage
    console.log("⬆️ Uploading files to storage...");
    const timestamp = Date.now();
    const p12Filename = `${certName}-${timestamp}.p12`;
    const provisionFilename = `${certName}-${timestamp}.mobileprovision`;

    const [p12Upload, provisionUpload] = await Promise.all([
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

    // Handle upload errors
    if (p12Upload.error || provisionUpload.error) {
      // Clean up uploaded files if any
      const filesToRemove = [];
      if (p12Upload.data) filesToRemove.push(p12Filename);
      if (provisionUpload.data) filesToRemove.push(provisionFilename);
      
      if (filesToRemove.length > 0) {
        await supabase.storage.from('certificates').remove(filesToRemove);
      }

      throw new Error(
        `Lỗi upload file: ${p12Upload.error?.message || provisionUpload.error?.message}`
      );
    }

    // 5. Get public URLs
    const p12Url = supabase.storage
      .from('certificates')
      .getPublicUrl(p12Upload.data.path).data.publicUrl;
    
    const provisionUrl = supabase.storage
      .from('certificates')
      .getPublicUrl(provisionUpload.data.path).data.publicUrl;

    // 6. Upsert to database (SỬA TẠI ĐÂY)
    console.log("💾 Saving to database...");
    const upsertData = {
      // Chỉ thêm ID khi cập nhật bản ghi đã tồn tại
      ...(existingCert && { id: existingCert.id }),
      name: certName,
      p12_url: p12Url,
      provision_url: provisionUrl,
      password: password,
      updated_at: new Date().toISOString()
    };

    const { data: certData, error: dbError } = await supabase
      .from('certificates')
      .upsert(upsertData, {
        onConflict: 'name', // Xử lý trùng name
        returning: 'representation' // Trả về bản ghi đầy đủ
      })
      .select()
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      // Rollback: Xóa file đã upload nếu DB lỗi
      await supabase.storage.from('certificates').remove([p12Filename, provisionFilename]);
      throw new Error(`Lỗi database: ${dbError.message}`);
    }

    // 7. Success response
    console.log("✅ Upload completed");
    res.status(200).json({
      success: true,
      message: existingCert 
        ? "Cập nhật chứng chỉ thành công" 
        : "Tạo chứng chỉ mới thành công",
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
        details: {
          error: error.message,
          stack: error.stack
        }
      })
    });
  }
}