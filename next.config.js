module.exports = {
  reactStrictMode: true,
  images: {
    domains: [
      'storeios.net',
      'is1-ssl.mzstatic.com',
      'is2-ssl.mzstatic.com',
      'is3-ssl.mzstatic.com',
      'is4-ssl.mzstatic.com',
      'is5-ssl.mzstatic.com'
    ]
  },
  async redirects() {
    return [
      {
        source: '/ads.txt',
        destination: 'https://srv.adstxtmanager.com/19390/storeios.net',
        permanent: true
      }
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/check-cert',
        destination: 'https://ipadl.storeios.net/api/check-revocation'
      }
    ];
  }
};
