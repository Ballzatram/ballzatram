import path from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { typedRoutes: true, externalDir: true },
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
      {
        source: "/tools/parcel",
        destination: "/land",
        permanent: false,
      },
      {
        source: "/tools/parcel/:path*",
        destination: "/land",
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
