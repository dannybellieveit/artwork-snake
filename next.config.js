/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/drop/:token',    // any /drop/XYZ
        destination: '/drop/index.html', // serve the static wrapper
      },
      {
        source: '/list-proxy/:token',
        destination: '/api/list-proxy/:token',
      },
    ];
  },
};
