import { supabase } from '../lib/supabase';
import Layout from '../components/Layout';
import Link from 'next/link';

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

              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {category.apps.map((app, index) => (
                  <Link href={`/${app.slug}`} key={app.id}>
                    <a className="flex items-start gap-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 px-1 rounded-lg transition">
                      {/* Icon */}
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-gray-300 dark:border-gray-600 flex-shrink-0 mt-1">
                        <img
                          src={app.icon_url || '/placeholder-icon.png'}
                          alt={app.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/placeholder-icon.png';
                          }}
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 border-b border-gray-200 dark:border-gray-700 pb-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {app.name}
                          </h3>
                          {app.version && (
                            <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full font-medium">
                              v{app.version}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {app.author || 'Không rõ tác giả'}
                        </p>
                      </div>
                    </a>
                  </Link>
                ))}
              </div>
            </div>
          ))}
      </div>
    </Layout>
  );
}

export async function getServerSideProps() {
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
        apps: apps || []
      };
    })
  );

  return {
    props: {
      categoriesWithApps
    }
  };
}