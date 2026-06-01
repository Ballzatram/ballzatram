import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true },
  async redirects() {
    return [
      {
        source: "/macro-board",
        destination: "/quant-library",
        permanent: false,
      },
      {
        source: "/macro-board/:path*",
        destination: "/quant-library",
        permanent: false,
      },
      {
        source: "/tools/macroboard/:path*",
        destination: "/quant-library",
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
