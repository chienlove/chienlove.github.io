export default function handler(req, res) {
  res.status(200).json({
    JWT_SECRET: process.env.JWT_SECRET ? "exists" : "missing",
    ALL_ENV_KEYS: Object.keys(process.env)
  });
}