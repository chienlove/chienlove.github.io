// Thêm vào phần parse body:
const { code, password, workerId: requestedWorkerId } = JSON.parse(event.body);

// Sử dụng worker ID từ request hoặc từ env var
const workerId = requestedWorkerId || process.env.CLOUDFLARE_WORKER_ID;

if (!workerId) {
  return {
    statusCode: 400,
    body: JSON.stringify({ error: 'Worker ID is required' })
  };
}