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
      const plistResponse = await axios.get(url);
      
      // Log mã trạng thái HTTP
      console.log('Mã trạng thái HTTP:', plistResponse.status); 
      
      // Log toàn bộ header của phản hồi
      console.log('Header của phản hồi:', plistResponse.headers);

      // Log toàn bộ nội dung phản hồi từ server
      console.log('Nội dung trả về từ server:', plistResponse.data); 

      // Kiểm tra xem phản hồi có phải là tài liệu XML hợp lệ không
      if (!plistResponse.data || !plistResponse.data.startsWith('<?xml')) {
        console.error('Phản hồi không phải là tài liệu XML hợp lệ');
        return {
          statusCode: 500,
          body: JSON.stringify({ error: `Phản hồi không phải là tài liệu XML hợp lệ. Mã trạng thái HTTP: ${plistResponse.status}` }),
        };
      }

      // Phân tích nội dung plist
      const plistData = plist.parse(plistResponse.data);
      console.log('Dữ liệu plist đã phân tích:', plistData);

      // Trích xuất URL IPA từ file plist
      const ipaAsset = plistData.items && plistData.items[0].assets.find(asset => asset.kind === 'software-package');
      if (!ipaAsset || !ipaAsset.url) {
        console.error('Không thể tìm thấy URL IPA trong file plist');
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Không thể tìm thấy URL IPA trong file plist' }),
        };
      }

      ipaUrl = ipaAsset.url;
      console.log('URL IPA đã trích xuất:', ipaUrl);
    }

    // Gửi yêu cầu HEAD để lấy kích thước file IPA
    console.log('Đang gửi yêu cầu HEAD tới URL IPA:', ipaUrl);
    const response = await axios.head(ipaUrl);
    console.log('Phản hồi từ yêu cầu HEAD:', response.headers);

    const fileSize = response.headers['content-length'];
    if (fileSize) {
      const fileSizeMB = (parseInt(fileSize) / (1024 * 1024)).toFixed(2);
      return {
        statusCode: 200,
        body: JSON.stringify({ size: `${fileSizeMB} MB` }),
      };
    } else {
      console.error('Không thể tìm thấy kích thước file');
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Không thể tìm thấy kích thước file' }),
      };
    }
  } catch (error) {
    console.error('Lỗi trong quá trình xử lý:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Lỗi khi lấy kích thước file: ${error.message}` }),
    };
  }
};