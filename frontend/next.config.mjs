import path from "node:path";

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
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@": path.resolve(process.cwd(), "src"),
    };
    return config;
  },
};
export default nextConfig;
