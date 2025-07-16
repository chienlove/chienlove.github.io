import { createServerClient } from '@supabase/ssr';
import { parse, serialize } from 'cookie';
import Layout from '../components/Layout';
import AppCard from '../components/AppCard';

export default function Home({ categoriesWithApps }) {
  return (
    <Layout>
      <div className="container mx-auto px-1 md:px-2 py-6 space-y-10">
        {categoriesWithApps
          .filter((category) => category.apps.length > 0)
          .map((category) => (
            <div
              key={category.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-4 md:px-6 pt-6 pb-2"
            >
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">
                {category.name}
              </h2>
              <div>
                {category.apps.map((app) => (
                  <AppCard key={app.id} app={app} mode="list" />
                ))}
              </div>
            </div>
          ))}
      </div>
    </Layout>
  );
}

export async function getServerSideProps(ctx) {
  const cookies = parse(ctx.req.headers.cookie || '');

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (name) => cookies[name],
        set: (name, value, options) => {
          ctx.res.setHeader('Set-Cookie', serialize(name, value, options));
        },
        remove: (name, options) => {
          ctx.res.setHeader(
            'Set-Cookie',
            serialize(name, '', { ...options, maxAge: -1 })
          );
        },
      },
      headers: ctx.req.headers,
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== 'admin@storeios.net') {
    return {
      redirect: {
        destination: '/under-construction',
        permanent: false,
      },
    };
  }

  const { data: categories } = await supabase.from('categories').select('id, name');

  const categoriesWithApps = await Promise.all(
    (categories || []).map(async (category) => {
      const { data: apps } = await supabase
        .from('apps')
        .select('*')
        .eq('category_id', category.id)
        .order('created_at', { ascending: false });

      return {
        ...category,
        apps: apps || [],
      };
    })
  );

  return {
    props: {
      categoriesWithApps,
    },
  };
}