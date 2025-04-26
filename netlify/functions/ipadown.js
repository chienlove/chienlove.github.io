// netlify/functions/ipadown.js
const { execFile } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const execFileAsync = util.promisify(execFile);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'Method Not Allowed' }) 
    };
  }

  try {
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Invalid request format',
          details: 'Unable to parse request body as JSON'
        })
      };
    }
    
    const { bundleId, sessionInfo } = requestData;
    
    if (!bundleId || !sessionInfo) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required parameters',
          details: 'bundleId and sessionInfo are required'
        })
      };
    }
    
    // Sử dụng cùng đường dẫn ipatool như trong authenticate.js
    const ipatoolPath = path.join(process.cwd(), 'netlify', 'functions', 'bin', 'ipatool');
    console.log('ipatool path:', ipatoolPath); // Để debug đường dẫn

    // Kiểm tra file tồn tại
    if (!require('fs').existsSync(ipatoolPath)) {
      console.error('ipatool not found at:', ipatoolPath);
      throw new Error('ipatool binary not found');
    }
    
    // Set HOME environment variable to /tmp
    process.env.HOME = '/tmp';

    // Prepare session info as string
    const sessionInfoStr = typeof sessionInfo === 'string' 
      ? sessionInfo 
      : JSON.stringify(sessionInfo);
    
    console.log('Starting download for bundle ID:', bundleId);

    // Use ipatool to download the IPA
    const { stdout, stderr } = await execFileAsync(ipatoolPath, [
      'download', 
      '--bundle-identifier', bundleId, 
      '--session-info', sessionInfoStr
    ]);
    
    console.log('Download stdout:', stdout);
    if (stderr) {
      console.log('Download stderr:', stderr);
    }
    
    // Parse the output to get the path of the downloaded IPA
    let downloadPath;
    try {
      const result = JSON.parse(stdout);
      downloadPath = result.path;
      
      if (!downloadPath) {
        throw new Error('Download path not found in the response');
      }
    } catch (parseError) {
      console.error('Error parsing download output:', parseError);
      throw new Error('Failed to parse download output: ' + stdout);
    }

    // Check if file exists
    try {
      await fs.access(downloadPath);
    } catch (fileError) {
      console.error('File not found:', downloadPath);
      throw new Error('Downloaded file not found at expected path');
    }

    // Read the IPA file
    const ipaContent = await fs.readFile(downloadPath);
    console.log('Successfully read IPA file, size:', ipaContent.length);

    // Delete the file after reading
    try {
      await fs.unlink(downloadPath);
      console.log('Deleted temporary IPA file');
    } catch (unlinkError) {
      console.warn('Failed to delete temporary file:', unlinkError);
      // Continue anyway
    }

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