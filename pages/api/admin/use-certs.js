// pages/api/admin/use-certs.js
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
};

import { createClient } from '@supabase/supabase-js';

// Helper function để log thông tin nhạy cảm an toàn
const safeLog = (value, visibleChars = 4) => {
  if (!value) return 'MISSING';
  if (value.length <= visibleChars * 2) return '***';
  return `${value.substring(0, visibleChars)}***${value.slice(-visibleChars)}`;
};

// Khởi tạo Supabase client với kiểm tra nghiêm ngặt
let supabase;
try {
  if (!process.env.SUPABASE_URL) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined');
  }

  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  console.log('✅ Supabase client initialized successfully');
} catch (initError) {
  console.error('❌ Supabase initialization failed:', initError.message);
  console.error('Configuration:', {
    SUPABASE_URL: safeLog(process.env.SUPABASE_URL),
    SUPABASE_SERVICE_ROLE_KEY: safeLog(process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
  throw initError; // Crash early nếu config sai
}

export default async function handler(req, res) {
  console.log('\n===== NEW REQUEST =====');
  console.log('Endpoint:', '/api/admin/use-certs');
  console.log('Method:', req.method);
  console.log('Headers:', {
    'content-type': req.headers['content-type'],
    origin: req.headers['origin'],
  });

  // Kiểm tra phương thức
  if (req.method !== 'POST') {
    console.log('⚠ Method not allowed');
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
      allowed_methods: ['POST'],
    });
  }

  // Kiểm tra content-type
  if (!req.headers['content-type']?.includes('application/json')) {
    console.log('⚠ Invalid content-type');
    return res.status(400).json({
      success: false,
      error: 'Invalid content-type',
      required: 'application/json',
    });
  }

  try {
    // Parse và validate request body
    const { name, tag, identifier } = req.body;

    console.log('Request body:', { name, tag, identifier });

    if (!name || !tag || !identifier) {
      console.log('⚠ Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required_fields: ['name', 'tag', 'identifier'],
        received: { name, tag, identifier },
      });
    }

    // Kiểm tra GitHub PAT
    if (!process.env.GH_PAT) {
      console.error('❌ GitHub PAT is missing');
      throw new Error('GitHub PAT not configured');
    }

    // Truy vấn dữ liệu từ Supabase
    console.log('Querying Supabase for certificate:', name);
    const { data: cert, error: supabaseError } = await supabase
      .from('certificates')
      .select('*')
      .eq('name', name)
      .single();

    if (supabaseError) {
      console.error('❌ Supabase query error:', supabaseError);
      throw new Error(`Database error: ${supabaseError.message}`);
    }

    if (!cert) {
      console.log('⚠ Certificate not found');
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
        certificate_name: name,
      });
    }

    console.log('✅ Certificate found:', { id: cert.id, name: cert.name });

    // Kích hoạt GitHub Action
    const githubApiUrl = `https://api.github.com/repos/chienlove/chienlove.github.io/actions/workflows/sign-ipa.yml/dispatches`;
    console.log('Triggering GitHub Action:', githubApiUrl);

    const githubResponse = await fetch(githubApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GH_PAT}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: { tag, identifier },
      }),
    });

    if (!githubResponse.ok) {
      const errorText = await githubResponse.text();
      console.error('❌ GitHub API error:', {
        status: githubResponse.status,
        statusText: githubResponse.statusText,
        error: errorText,
      });
      throw new Error(`GitHub Action failed: ${githubResponse.status} ${githubResponse.statusText}`);
    }

    console.log('✅ GitHub Action triggered successfully');
    return res.status(200).json({
      success: true,
      message: 'Request processed successfully',
      certificate: { id: cert.id, name: cert.name },
      github_action: 'sign-ipa.yml',
    });

  } catch (error) {
    console.error('❌ Server error:', {
      message: error.message,
      stack: error.stack,
      environment: {
        supabase_configured: !!supabase,
        github_pat_configured: !!process.env.GH_PAT,
        node_env: process.env.NODE_ENV,
      },
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        details: {
          supabase_config: {
            url: safeLog(process.env.SUPABASE_URL),
            key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          },
          github_pat_configured: !!process.env.GH_PAT,
        },
      }),
    });
  }
}