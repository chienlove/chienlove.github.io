// pages/api/search.js
import { supabase } from '../../lib/supabase';

// Chỉ lấy các cột cần cho AppCard + metric, giảm size JSON
const APP_FIELDS = [
  'id',
  'name',
  'slug',
  'icon_url',
  'author',
  'version',
  'views',
  'installs',
  'downloads',
  'category_id',
  'created_at',
].join(',');

function sanitizeTerm(str = '') {
  return String(str)
    .replace(/[%]/g, ' ')   // tránh lỗi wildcard
    .replace(/,/g, ' ')     // tránh phá cú pháp .or()
    .slice(0, 80)           // giới hạn độ dài
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q = '', category = 'all', sort: sortParam } = req.query;

    const rawQ = Array.isArray(q) ? q[0] : q;
    const rawCategory = Array.isArray(category) ? category[0] : category;
    const sortRaw = Array.isArray(sortParam) ? sortParam[0] : sortParam;

    const term = sanitizeTerm(rawQ || '');
    const hasTerm = term.length > 0;
    const hasCategoryFilter = rawCategory && rawCategory !== 'all';

    // Không có keyword & không filter → không trả list lớn để tránh nặng
    if (!hasTerm && !hasCategoryFilter) {
      return res.status(200).json({ data: [] });
    }

    let sortBy = 'created_at';
    if (sortRaw === 'name') sortBy = 'name';
    else if (sortRaw === 'downloads') sortBy = 'downloads';
    else if (sortRaw === 'views') sortBy = 'views';
    else if (sortRaw === 'installs') sortBy = 'installs';

    let queryQ = supabase
      .from('apps')
      .select(APP_FIELDS)
      .limit(50) // tránh trả quá nhiều
      .order(sortBy, { ascending: sortBy === 'name' });

    if (hasTerm) {
      const cols = ['name', 'author', 'slug'];

      const tokens = term.split(/\s+/).filter((t) => t && t.length >= 3);

      const conditions = [];

      // full câu (nếu may mắn trùng)
      cols.forEach((col) => {
        conditions.push(`${col}.ilike.%${term}%`);
      });

      // từng từ khóa >= 3 ký tự (tối ưu cho kiểu "Aloha Fast Browser - Proxy VPN")
      tokens.forEach((tok) => {
        cols.forEach((col) => {
          conditions.push(`${col}.ilike.%${tok}%`);
        });
      });

      if (conditions.length > 0) {
        queryQ = queryQ.or(conditions.join(','));
      }
    }

    if (hasCategoryFilter) {
      queryQ = queryQ.eq('category_id', rawCategory);
    }

    const { data, error } = await queryQ;
    if (error) {
      console.error('Search API error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    return res.status(200).json({ data: data || [] });
  } catch (err) {
    console.error('Search API unexpected error:', err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
}