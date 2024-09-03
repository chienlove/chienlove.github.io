const admin = require('firebase-admin');

// Thay thế bằng cấu hình Firebase của bạn
const serviceAccount = {
  type: "service_account",
  project_id: "admin-panel-7418d",
  private_key_id: "a5f5d5e369f1480986c89f1d7c0d570107c597db",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6S+cbnOVw6gWh\nAAsp+HOlZ4r++dGIUiq4Prz3Xp0Ddq8wdnHkSiZem0mx4U9RXud1ehactKtPOzMN\n7W2jB6U8ITQjw0fZ7lxEp+56UgKfguM3ekoLCG4AM3efVp0uWKjKcrjGIsUHTXhN\n0/SJOm0Uv9sv2pkSWi8Rup/aF80Kom/q3eXYtIcNo+m3IkrCHOJ2paFRoepa0GcM\nH57oJAtKg/ZSprJX/SDTAiTOo8WJH9ynsKY4z9sYSw71dzurfChb4SDvMPli1uZj\nDQpq6m5Iu/nJCwpJWxRE38ApTR3om6wWF/kuupkKPGJU/PgRbWDDyLProE7h3kL6\n7DJFMb17AgMBAAECggEAWOTvGlX7ha2lkfWbXiOXy01lHdXHDe1nRRNqx/71nTl8\nzvs1zWE0feBLgf2pA4LtnzjqoUv0kpIFAphQwIJdbhvJ7Wa5WlxK2tfnC6cmaUbj\ndQ19V1ZmZuIoKngB+KOFp1SmpqTgr2NgDIMfJHwkoMoLpQICGKe/3g3XSRIiXPfk\nnOMagKrs2gey33shYpdbfmHCJCdiWr0wkbZaaPLQ27rWmp0ffPEPucrhAoRHSrVC\nvFtV8HCvWNTXRTodVoiajv6z7aqOKh9SRYhjPIhsWdEyHP967Ug89My89LpI7Ph3\nec4LnlOzDGLt7Xnu7LN1JbZ9c/Wui2vSdXj8qlAPwQKBgQDtUU+/HyM/d2GSgHYg\nc/bIyCPIzat7/GS6ihpHWPeDElM63jk6idTqre1ruj8FWyTXUfLCfquW8PksjcIq\nDAdowCCI4l4N76PyDb6UUE01VM2u4LwJ9S+tTHA0zUUw6G3byUK5cj2tvkso1Z0y\nPwWjCXhF7yFbtJ6D6336yt2v1QKBgQDI9ltWCw7YFSQs2StW7Ct8dXzuA2S6c2GP\ns4pAtYIc0/XnORAxc8bKMbL9NeGPRFdAZME185ZqtvhsoykpUy1bBOs0NS2XhObi\nevEAP1LzH04jPEDr7CVLGJPPuAzsFwYGYE3FfxBkH/Ma2E9+xstFSEQ4/CSNqIwP\nNZU7LwqwDwKBgBZh1dibsjJZKw2rKfjzlvHm1mEo7KR78HAbeFEEVgu5nbnunY0k\n1LzxfHPtk+YIa5gXNYMceUh6H7YRBJ/8lHJPtIHUf7Rmxpqcqz3HuRBvmBqHPZTe\n2AlLLUX9min7sejJuY5N9P0+9k26n+HOSdTPntVRsV650T1152LQ4UmlAoGAa6rR\ntH+oLEznXL/dYGyXv86SaFKZHOvEUWE3qQOV+iv1izQfYN9OmfWWl+LOPhu3Q2C3\nw1gGNpZg8pNX8jQGEMXJ3ea/znX93UlQ5XkH0AntqyMVBVE3icxZJOjOw45yQ+hE\nwpMZDQuxC6jorluDfFMDeiRc0SiEIYHruhGyADECgYEAjcIIvmUlBOWdMyr7UHBe\nIn9HcUjVQka/alE0DUfhskV0xy2CZFKq380Sgq2Qo7cQnjg2qoO3/YyP3TYo+71G\nsl1/mMyvFfHLy2eTBE1FylzqXJW9o9KiWlI3smjn4BJUvQrp4MpLkD+S8Ipr9i17\n0ebUIfJ7l8obkzXy4+MvR9s=\n-----END PRIVATE KEY-----\n",
  client_email: "firebase-adminsdk-2ybkv@admin-panel-7418d.iam.gserviceaccount.com",
  client_id: "101962615359762469693",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-2ybkv%40admin-panel-7418d.iam.gserviceaccount.com"
};

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method not allowed" }),
    };
  }

  let data;
  try {
    data = JSON.parse(event.body);
  } catch (error) {
    console.error("Error parsing JSON: ", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid JSON format" }),
    };
  }

  if (!data || !data.posts || !Array.isArray(data.posts)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Invalid data format" }),
    };
  }

  try {
    const batch = db.batch();

    data.posts.forEach(post => {
      console.log(`Processing post with slug: ${post.slug}`);
      const docRef = db.collection('posts').doc(post.slug);
      batch.set(docRef, post);
    });

    await batch.commit();

    console.log("Data uploaded successfully");
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Data uploaded successfully" }),
    };
  } catch (error) {
    console.error("Error uploading data: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" }),
    };
  }
};