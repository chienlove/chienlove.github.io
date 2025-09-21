// pages/category/[slug].js
import { supabase } from '../../lib/supabase';
import Layout from '../../components/Layout';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faDownload, faEye } from '@fortawesome/free-solid-svg-icons';

export async function getServerSideProps(context) {
  const { slug } = context.params;

  // Lấy thông tin category
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .single();

  if (categoryError || !category) {
    return { notFound: true };
  }

  // Lấy apps trong category
  const { data: apps, error: appsError } = await supabase
    .from('apps')
    .select('*')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });

  return {
    props: {
      category,
      apps: apps || [],
    },
  };
}

export default function CategoryPage({ category, apps }) {
  const router = useRouter();

  if (!category) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Category not found</h1>
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-blue-600 text-white rounded"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              Back to Home
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold">{category.name}</h1>
          <p className="text-gray-600 mt-2">
            {apps.length} app{apps.length !== 1 ? 's' : ''} in this category
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {apps.map((app) => (
            <Link
              key={app.id}
              href={`/${app.slug}`}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <img
                    src={app.icon_url || '/placeholder-icon.png'}
                    alt={app.name}
                    className="w-16 h-16 rounded-lg mr-4"
                  />
                  <div>
                    <h3 className="font-semibold text-lg">{app.name}</h3>
                    <p className="text-gray-600 text-sm">{app.author}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>v{app.version}</span>
                  <span className="flex items-center">
                    <FontAwesomeIcon icon={faDownload} className="mr-1" />
                    {app.downloads || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {apps.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No apps found in this category.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}