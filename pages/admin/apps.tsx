import { useState } from 'react';
import { sql } from '@vercel/postgres';
import { uploadImage } from '@/lib/firebase';

export default function AdminApps() {
  const [apps, setApps] = useState([]);
  const [form, setForm] = useState({
    name: '',
    icon: null,
    author: '',
    description: '',
    testflight_link: '',
    category_id: 1
  });

  // Thêm app mới
  const handleSubmit = async (e) => {
    e.preventDefault();
    const iconUrl = await uploadImage(form.icon);
    await sql`
      INSERT INTO apps (name, icon_url, author, description, testflight_link, category_id)
      VALUES (${form.name}, ${iconUrl}, ${form.author}, ${form.description}, ${form.testflight_link}, ${form.category_id})
    `;
    alert('Thêm app thành công!');
  };

  return (
    <div>
      <h1>Quản lý ứng dụng</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Tên app"
          value={form.name}
          onChange={(e) => setForm({...form, name: e.target.value})}
        />
        <input
          type="file"
          onChange={(e) => setForm({...form, icon: e.target.files[0]})}
        />
        <button type="submit">Lưu</button>
      </form>
    </div>
  );
}