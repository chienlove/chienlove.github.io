import { sql } from '@vercel/postgres';

// Khởi tạo bảng apps và categories (chạy 1 lần)
export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS apps (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon_url VARCHAR(255),
      author VARCHAR(100),
      description TEXT,
      testflight_link VARCHAR(255) UNIQUE,
      category_id INT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    )
  `;
}