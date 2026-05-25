/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // pdfjs-dist ships a "canvas" optional dependency that breaks Next.js builds.
    // Telling webpack to ignore it is the standard fix.
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
