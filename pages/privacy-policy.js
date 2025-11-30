import Head from 'next/head';
import Layout from '../components/Layout';

export default function PrivacyPolicy() {
  return (
    <Layout fullWidth={false}>
      <Head>
        <title>Privacy Policy – StoreiOS</title>
        <meta name="description" content="Privacy Policy of StoreiOS – how we collect, use, protect user data." />
        <meta name="robots" content="index, follow" />
      </Head>

      <div className="max-w-3xl mx-auto py-8 text-gray-800 dark:text-gray-200">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4">
          StoreiOS ("we", "our", or "the site") is committed to protecting your privacy. 
          This Privacy Policy explains how your information is collected, used, and safeguarded 
          when you visit <strong>storeios.net</strong>.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">1. Information We Collect</h2>
        <p className="mb-3">We may collect:</p>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Basic device information (browser type, OS, IP address)</li>
          <li>Analytics data (pages visited, time on site, search queries)</li>
          <li>Information you provide voluntarily (comments, login data via Firebase Auth)</li>
          <li>Cookie data for personalization & advertising</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">2. Use of Cookies</h2>
        <p className="mb-4">
          We use cookies for analytics, site functionality, and advertising. 
          Third-party vendors, including Google, use cookies to serve personalized ads.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">3. Third-Party Services</h2>
        <p className="mb-3">We use the following services:</p>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Google AdSense (personalized ad delivery)</li>
          <li>Google Analytics / Ads measurement</li>
          <li>Supabase (database & API)</li>
          <li>Firebase Authentication (login)</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">4. How We Use Your Information</h2>
        <p className="mb-4">We use collected data to:</p>
        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Improve site performance and features</li>
          <li>Secure user accounts</li>
          <li>Deliver relevant content</li>
          <li>Serve personalized/non-personalized ads</li>
        </ul>

        <h2 className="text-xl font-semibold mt-6 mb-2">5. Data Protection</h2>
        <p className="mb-4">
          We do not sell or share your personal information.  
          All data is stored securely via trusted service providers.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">6. Advertising</h2>
        <p className="mb-4">
          StoreiOS displays ads provided by Google AdSense and other partners.  
          Third-party vendors use cookies to personalize advertisements.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">7. Children's Privacy</h2>
        <p className="mb-4">
          We do not knowingly collect information from children under 13.  
          If you believe such data has been collected, contact us to remove it.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">8. Changes to This Policy</h2>
        <p className="mb-4">
          We may update this policy at any time. Updates will be posted on this page.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2">9. Contact</h2>
        <p className="mb-4">
          For any questions regarding this Privacy Policy, contact us at:  
          <a href="mailto:admin@storeios.net" className="text-blue-500 underline">admin@storeios.net</a>
        </p>
      </div>
    </Layout>
  );
}