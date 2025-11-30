import Head from 'next/head';
import Layout from '../components/Layout';

export default function Terms() {
  return (
    <Layout fullWidth={false}>
      <Head>
        <title>Terms of Service – StoreiOS</title>
        <meta name="description" content="Terms of Service for StoreiOS." />
      </Head>

      <div className="max-w-3xl mx-auto py-8 text-gray-800 dark:text-gray-200">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <p className="mb-4">
          By accessing StoreiOS ("the site"), you agree to be bound by these Terms of Service.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Use of Website</h2>
        <p className="mb-4">
          You may use StoreiOS for personal and non-commercial purposes only.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Content</h2>
        <p className="mb-4">
          All content on StoreiOS is provided for informational and educational purposes.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. External Links</h2>
        <p className="mb-4">
          StoreiOS contains links to third-party websites. We are not responsible for the content of external sites.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. Disclaimer</h2>
        <p className="mb-4">
          StoreiOS does not host paid apps, cracked apps, or illegal software.  
          We only provide information and tools for personal use.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Limitation of Liability</h2>
        <p className="mb-4">
          We are not responsible for any damage resulting from the use of information or tools on this website.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">6. Changes</h2>
        <p className="mb-4">
          We may update these Terms at any time without notice.
        </p>
      </div>
    </Layout>
  );
}