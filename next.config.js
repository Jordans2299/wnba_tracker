/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "a.espncdn.com",
        pathname: "/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/players/:slug",
        destination: "/wnba/players/:slug",
        permanent: true,
      },
      {
        source: "/teams/:slug",
        destination: "/wnba/teams/:slug",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
