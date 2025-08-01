module.exports = {
  serverRuntimeConfig: {
    JWT_SECRET: process.env.JWT_SECRET,
  },
  publicRuntimeConfig: {
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  }
};