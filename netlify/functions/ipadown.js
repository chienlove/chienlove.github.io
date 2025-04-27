// netlify/functions/ipadown.js
const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { bundleId, sessionInfo } = JSON.parse(event.body);
    
    // Sử dụng cùng đường dẫn ipatool như trong authenticate.js
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');
    console.log('ipatool path:', ipatoolPath);

    // Kiểm tra file tồn tại
    if (!require('fs').existsSync(ipatoolPath)) {
      console.error('ipatool not found at:', ipatoolPath);
      throw new Error('ipatool binary not found');
    }
    
    // Set HOME environment variable to /tmp
    process.env.HOME = '/tmp';

    // Use ipatool to download the IPA
    console.log('Starting download for bundle:', bundleId);
    const { stdout, stderr } = await execFileAsync(
      ipatoolPath, 
      [
        'download', 
        '--bundle-identifier', 
        bundleId, 
        '--session-info', 
        JSON.stringify(sessionInfo)
      ],
      { timeout: 60000 } // 60 seconds timeout
    );
    
    if (stderr && stderr.trim() !== '') {
      console.error('Download stderr:', stderr);
      throw new Error(stderr);
    }

    // Parse the output to get the path of the downloaded IPA
    let downloadResult;
    try {
      downloadResult = JSON.parse(stdout);
    } catch (parseError) {
      console.error('Failed to parse download output:', stdout);
      throw new Error('Failed to parse download result');
    }

    if (!downloadResult.path) {
      throw new Error('Download failed: no path in result');
    }

    const downloadPath = downloadResult.path;
    console.log('Downloaded IPA path:', downloadPath);

    // Read the IPA file
    const ipaContent = await fs.readFile(downloadPath);

    // Delete the file after reading
    await fs.unlink(downloadPath);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${path.basename(downloadPath)}"`
      },
      body: ipaContent.toString('base64'),
      isBase64Encoded: true
    };
  } catch (error) {
    console.error('Download error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to download IPA',
        details: error.message 
      })
    };
  }
};