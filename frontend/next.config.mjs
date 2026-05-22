/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  async redirects() {
    return [
      {
        source: "/tools/macroboard/:path*",
        destination: "/macro-board",
        permanent: false,
      },
    ];
  },
};
export default nextConfig;
