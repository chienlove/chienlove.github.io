// netlify/functions/download.js
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
    
    // Use ipatool to download the IPA
    const { stdout } = await execFileAsync('ipatool', ['download', '--bundle-identifier', bundleId, '--session-info', JSON.stringify(sessionInfo)]);
    
    // Parse the output to get the path of the downloaded IPA
    const downloadPath = JSON.parse(stdout).path;

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