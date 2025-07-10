/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/list-proxy/:token',
        destination: '/api/list-proxy/:token',
      },
      {
        source: '/share-proxy/:token',
        destination: '/api/share-proxy/:token',
      },
    ];
  },
};
