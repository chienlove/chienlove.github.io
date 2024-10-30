// netlify/functions/getTelegramFiles.js
const fetch = require('node-fetch');

exports.handler = async () => {
  const { TELEGRAM_BOT_TOKEN } = process.env;

  try {
    // Gọi `getUpdates` để lấy danh sách tin nhắn chứa file
    const updatesResponse = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`
    );
    const updatesData = await updatesResponse.json();

    // Lọc các tin nhắn chứa file và lấy `file_id` cùng `file_name`
    const files = updatesData.result
      .filter((msg) => msg.message && msg.message.document)
      .map((msg) => ({
        fileId: msg.message.document.file_id,
        fileName: msg.message.document.file_name,
      }));

    // Duyệt qua từng file để lấy link tải từ `file_id`
    const filesWithLinks = await Promise.all(
      files.map(async (file) => {
        // Gọi `getFile` để lấy link tải file từ `file_id`
        const fileResponse = await fetch(
          `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile?file_id=${file.fileId}`
        );
        const fileData = await fileResponse.json();

        // Tạo link tải đầy đủ
        const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${fileData.result.file_path}`;
        return {
          fileName: file.fileName,
          downloadUrl: downloadUrl,
        };
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify(filesWithLinks),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Lỗi khi gọi API Telegram.", error }),
    };
  }
};