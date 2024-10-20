// netlify/functions/download.js
const axios = require('axios');

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { bundleId, sessionToken } = JSON.parse(event.body);
    
    // Get download URL for the IPA
    const downloadInfoResponse = await axios.post(
      'https://p*-buy.itunes.apple.com/WebObjects/MZFinance.woa/wa/volumeStoreDownloadProduct', 
      {
        bundleId: bundleId,
        platform: 'ios'
      },
      {
        headers: {
          'Cookie': `X-Apple-Session-Token=${sessionToken}`,
          'Accept': 'application/json'
        }
      }
    );

    const downloadUrl = downloadInfoResponse.data.downloadUrl;

    // Get the actual IPA file
    const ipaResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'Cookie': `X-Apple-Session-Token=${sessionToken}`
      }
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${bundleId}.ipa"`
      },
      body: Buffer.from(ipaResponse.data).toString('base64'),
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