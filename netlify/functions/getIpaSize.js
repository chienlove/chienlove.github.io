const axios = require('axios');
const plist = require('plist');

exports.handler = async function(event) {
  const url = event.queryStringParameters.url;

  if (!url) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'URL không được cung cấp' }),
    };
  }

  try {
    let ipaUrl = url;

    // Nếu là URL .plist, trích xuất URL IPA từ nó
    if (url.endsWith('.plist')) {
      console.log('Đang xử lý file plist từ URL:', url);

      // Gửi yêu cầu GET để tải nội dung file plist
      const plistResponse = await axios.get(url, { responseType: 'arraybuffer' });

      // Kiểm tra header Content-Type để đảm bảo server trả về đúng loại nội dung
      const contentType = plistResponse.headers['content-type'];
      
      // Chuyển Buffer thành chuỗi sử dụng UTF-8 encoding
      const plistText = Buffer.from(plistResponse.data, 'binary').toString('utf8');
      
      // Kiểm tra nếu nội dung không phải là XML hợp lệ
      if (!contentType.includes('application/xml') && !plistText.startsWith('<?xml')) {
        console.error('Phản hồi không phải là tài liệu XML hợp lệ');
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Phản hồi không hợp lệ. Content-Type: ${contentType}, HTTP Status: ${plistResponse.status}` }),
        };
      }

      // Phân tích nội dung plist
      const plistData = plist.parse(plistText);

      // Trích xuất URL IPA từ file plist
      const ipaAsset = plistData.items && plistData.items[0].assets.find(asset => asset.kind === 'software-package');
      if (!ipaAsset || !ipaAsset.url) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Không thể tìm thấy URL IPA trong file plist' }),
        };
      }

      ipaUrl = ipaAsset.url;
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    const response = await axios.head(ipaUrl);
    const fileSize = response.headers['content-length'];

    // Kiểm tra và trả về kích thước file
    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      
      // Trả về JSON chỉ có kích thước file
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }), // Chỉ trả về kích thước file
      };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Không thể tìm thấy kích thước file' }),
      };
    }
  } catch (error) {
    // Log chi tiết về lỗi và trả về thông báo lỗi đơn giản
    console.error('Lỗi trong quá trình xử lý:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Có lỗi xảy ra khi lấy kích thước file' }),
    };
  }
};