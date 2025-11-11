// pages/sitemap.xml.js
import { supabase } from '../lib/supabase';

function generateSiteMap(apps) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Trang chủ -->
  <url>
    <loc>https://storeios.net</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Categories -->
  <url>
    <loc>https://storeios.net/tools</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://storeios.net/categories</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://storeios.net/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>

  <!-- Apps - Dynamic -->
${apps.map(app => `
  <url>
    <loc>https://storeios.net/${app.slug}</loc>
    <lastmod>${new Date(app.updated_at || app.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('')}
</urlset>`;
}

export async function getServerSideProps({ res }) {
  const { data: apps } = await supabase
    .from('apps')
    .select('slug, updated_at, created_at')
    .order('created_at', { ascending: false });

  const sitemap = generateSiteMap(apps || []);

  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600'); // Cache 1 giờ
  res.write(sitemap);
  res.end();

  return {
    props: {},
  };
}

export default function Sitemap() {
  return null; // Component sẽ không được render
}
