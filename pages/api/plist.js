import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

const secret = process.env.JWT_SECRET;

export default function handler(req, res) {
  const { id, token } = req.query;

  if (!id || !token) {
    return res.status(400).send('Missing id or token');
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.id !== id) return res.status(403).send('Invalid token');

    const filePath = path.join(process.cwd(), 'secure/plist', `${id}.plist`);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('Plist not found');
    }

    res.setHeader('Content-Type', 'application/xml');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return res.status(403).send('Expired or invalid token');
  }
}