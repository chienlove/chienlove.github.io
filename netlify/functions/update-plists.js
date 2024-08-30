const axios = require('axios');
const fs = require('fs');
const path = require('path');
const plist = require('plist');

exports.handler = async function(event, context) {
  const mappings = {
    'https://file.jb-apps.me/plist/Unc0ver_old.plist': 'unc0ver.plist',
    'https://example.com/file2.plist': 'file2.plist',
    // Thêm các ánh xạ khác
  };

  try {
    for (const [url, targetFile] of Object.entries(mappings)) {
      // Lấy dữ liệu plist từ URL
      const response = await axios.get(url);
      const plistData = plist.parse(response.data);

      const ipaLink = plistData?.items[0]?.assets[0]?.url;
      const version = plistData?.items[0]?.metadata?.bundleVersion;
      const identifier = plistData?.items[0]?.metadata?.bundleIdentifier;

      const extractedData = {
        assets: [
          {
            kind: 'software-package',
            url: ipaLink,
          },
          // Bạn có thể thêm các asset khác ở đây
        ],
        metadata: {
          'bundle-identifier': identifier,
          'bundle-version': version,
          kind: 'software',
          // Bạn có thể thêm các thuộc tính metadata khác ở đây
        },
      };

      // Đường dẫn tới file plist mục tiêu
      const targetFilePath = path.join(__dirname, `../../static/plist/${targetFile}`);
      const targetPlistContent = fs.readFileSync(targetFilePath, 'utf8');
      const targetPlistData = plist.parse(targetPlistContent);

      // Tìm mục với bundle-identifier và ghi đè lên
      const itemIndex = targetPlistData.items.findIndex(
        item => item.metadata['bundle-identifier'] === identifier
      );

      if (itemIndex !== -1) {
        // Ghi đè lên mục hiện có
        targetPlistData.items[itemIndex] = extractedData;
      } else {
        // Nếu không tìm thấy, thêm mới
        targetPlistData.items.push(extractedData);
      }

      // Ghi lại file plist đã cập nhật
      const updatedPlistContent = plist.build(targetPlistData);
      fs.writeFileSync(targetFilePath, updatedPlistContent);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Plist files updated successfully' }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update plist files', details: error.message }),
    };
  }
};