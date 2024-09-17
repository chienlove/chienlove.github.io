const axios = require('axios');

async function fetchVideoSuggestions() {
  const cTime = Date.now();
  const url = `https://api.zalo.video/v1/home/trending/get/list_video_suggestion?cTime=${cTime}&sig=b23419569c62b294f85b215c4ff606ca`;
  
  try {
    const response = await axios.get(url);
    console.log('Trạng thái:', response.status);
    console.log('Dữ liệu video:', response.data);
  } catch (error) {
    if (error.response) {
      // Máy chủ phản hồi với mã trạng thái nằm ngoài phạm vi 2xx
      console.error('Lỗi phản hồi:', error.response.status);
      console.error('Nội dung phản hồi:', error.response.data);
    } else if (error.request) {
      // Yêu cầu được gửi đi nhưng không nhận được phản hồi
      console.error('Lỗi yêu cầu:', error.request);
    } else {
      // Một lỗi xảy ra khi cài đặt yêu cầu
      console.error('Lỗi khi gọi API:', error.message);
    }
  }
}

fetchVideoSuggestions();