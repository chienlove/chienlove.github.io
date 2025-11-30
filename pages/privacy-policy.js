import Head from 'next/head';
import Layout from '../components/Layout';

export default function PrivacyPolicy() {
  const title = 'Privacy Policy – StoreiOS';
  const description =
    'Official Privacy Policy of StoreiOS – how user data is collected, used, protected, and handled. We do not host, share, or distribute cracked apps or illegal software.';
  const url = 'https://storeios.net/privacy-policy';

  return (
    <Layout fullWidth={false}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />

        <link rel="canonical" href={url} />

        {/* Open Graph */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={url} />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <div className="max-w-3xl mx-auto py-10 text-gray-800 dark:text-gray-200 leading-relaxed">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4">
          StoreiOS ("we", "our", or "the site") is committed to protecting your privacy and ensuring transparency regarding how your information is handled when you use{' '}
          <strong>storeios.net</strong>. StoreiOS is an independent platform and is{' '}
          <strong>not affiliated with Apple Inc.</strong>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">1. Content Integrity & Legal Compliance</h2>
        <p className="mb-4">
          StoreiOS does <strong>not</strong> host, distribute, or promote:
        </p>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Hacked, cracked, modded, or cheat-injected applications.</li>
          <li>Paid applications shared without permission from developers.</li>
          <li>Malicious or harmful software.</li>
        </ul>
        <p className="mb-4">
          StoreiOS only provides <strong>installation links</strong> or <strong>tools</strong> to help users
          install applications that they <strong>already own the rights to use</strong>.  
          We do not store copyrighted IPA files.  
          All responsibility for uploaded content remains with the user.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">2. Information We Collect</h2>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Device information (browser type, OS, IP address)</li>
          <li>Analytics data (pages viewed, time on site, search queries)</li>
          <li>Authentication info via Firebase (if you log in)</li>
          <li>Cookies for ads personalization</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">3. Cookies & Advertising</h2>
        <p className="mb-4">
          We use cookies to enhance functionality, improve analytics, and serve personalized/non-personalized ads.
          Third-party vendors, including Google, use cookies to deliver ads based on user interests.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">4. Third-Party Services</h2>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Google AdSense</li>
          <li>Google Analytics</li>
          <li>Supabase (database)</li>
          <li>Firebase Authentication</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">5. Your Advertising Choices</h2>
        <p className="mb-4">
          You can opt out of personalized ads via Google Ads Settings:{' '}
          <a
            href="https://www.google.com/settings/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            https://www.google.com/settings/ads
          </a>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">6. Children’s Privacy</h2>
        <p className="mb-4">
          StoreiOS does not knowingly collect data from children under the age of 13.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">7. Changes to This Policy</h2>
        <p className="mb-4">We may update this Privacy Policy at any time.</p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">8. Contact</h2>
        <p>
          For any questions, contact us at:{' '}
          <a href="mailto:admin@storeios.net" className="text-blue-500 underline">
            admin@storeios.net
          </a>
        </p>
      </div>
    </Layout>
  );
}