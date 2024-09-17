const axios = require('axios');

async function fetchVideoSuggestions() {
  const cTime = Date.now(); // Lấy thời gian hiện tại
  const url = `https://api.zalo.video/v1/home/trending/get/list_video_suggestion?cTime=${cTime}&sig=b23419569c62b294f85b215c4ff606ca`;
  
  try {
    const response = await axios.get(url);
    if (response.status === 200) {
      const data = response.data;
      console.log('Dữ liệu video:', data);
    } else {
      console.log('Không thể lấy dữ liệu, mã trạng thái:', response.status);
    }
  } catch (error) {
    console.error('Lỗi khi gọi API:', error);
  }
}

fetchVideoSuggestions();