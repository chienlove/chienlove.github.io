// functions/fakeGps.js
exports.handler = async (event, context) => {
  // Giả mạo tọa độ GPS ở Nhật Bản
  const fakeLocation = {
    latitude: 35.6895,  // Vĩ độ của Tokyo, Nhật Bản
    longitude: 139.6917  // Kinh độ của Tokyo, Nhật Bản
  };

  return {
    statusCode: 200,
    body: JSON.stringify(fakeLocation),
  };
};