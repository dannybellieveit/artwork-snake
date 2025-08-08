// Next.js config
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    // proxy token routes
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
