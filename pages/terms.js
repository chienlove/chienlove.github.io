import Head from 'next/head';
import Layout from '../components/Layout';

export default function Terms() {
  const title = 'Terms of Service – StoreiOS';
  const description =
    'Terms of Service for StoreiOS – rules, responsibilities, limitations, and usage conditions for storeios.net. No cracked, hacked, modded, or illegal apps.';
  const url = 'https://storeios.net/terms';

  return (
    <Layout fullWidth={false}>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={url} />

        {/* OG */}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={url} />
        <meta property="og:type" content="article" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Head>

      <div className="max-w-3xl mx-auto py-10 text-gray-800 dark:text-gray-200 leading-relaxed">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

        <p className="mb-4">
          By accessing StoreiOS ("the site"), you agree to follow the Terms of Service outlined below.
          StoreiOS is an independent platform and is <strong>not affiliated with Apple Inc.</strong>
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">1. Acceptable Use</h2>
        <p className="mb-4">
          You may use StoreiOS for personal, legal, and non-commercial purposes.  
          You agree not to misuse the tools or information provided.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">2. Content & Legal Compliance</h2>
        <p className="mb-4">
          StoreiOS does <strong>not</strong> host, distribute, promote, or link to:
        </p>

        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Hacked, cracked, modded, or cheat-injected applications.</li>
          <li>Paid apps shared without permission.</li>
          <li>Malware, harmful files, or illegal software.</li>
        </ul>

        <p className="mb-4">
          StoreiOS only provides <strong>installer links</strong> for applications that users legally own
          and upload themselves.  
          All IPA files or content uploaded to StoreiOS remain the responsibility of the user who provided them.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">3. External Links</h2>
        <p className="mb-4">
          The site may contain links to third-party websites.  
          We do not control or endorse external content and are not responsible for any damage or loss arising
          from their use.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">4. Limitations of Liability</h2>
        <p className="mb-4">
          StoreiOS is not liable for:
        </p>

        <ul className="list-disc ml-6 mb-4 space-y-1">
          <li>Loss of data caused by third-party apps or installation errors.</li>
          <li>Account issues (Apple ID, developer account, etc.)</li>
          <li>Any damages resulting from user misuse.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">5. Changes to Terms</h2>
        <p className="mb-4">
          Terms may be updated without notice. Continued use of the site signifies acceptance of updated terms.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">6. Governing Law</h2>
        <p className="mb-4">
          These Terms shall be governed and interpreted in accordance with Vietnamese law.  
          Any disputes will be handled by courts in Vietnam.
        </p>
      </div>
    </Layout>
  );
}