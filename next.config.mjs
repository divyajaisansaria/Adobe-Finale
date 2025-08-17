/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your existing settings are kept
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  // The webpack configuration is updated to handle both SVGs and Lottie files
  webpack(config) {
    // Rule for SVGs to be used as React components
    config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });

    // Rule for Lottie files to be treated as static assets
    config.module.rules.push({
      test: /\.lottie$/,
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;