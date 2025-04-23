const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // 1. Lấy TestFlight URL từ tham số
    const { testflightUrl } = JSON.parse(event.body);
    
    // 2. Gửi request GET đến trang TestFlight
    const response = await axios.get(testflightUrl);
    const html = response.data;
    
    // 3. Phân tích HTML để xác định trạng thái
    let status;
    if (html.includes("This beta is full.")) {
      status = "FULL"; // Khi tìm thấy thông báo đầy
    } else if (html.includes("Accept")) {
      status = "AVAILABLE"; // Khi thấy nút "Accept" (chấp nhận tham gia)
    } else {
      status = "UNKNOWN"; // Không xác định
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to check status" })
    };
  }
};