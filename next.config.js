/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.0.0.86"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pyxis.nymag.com",
        pathname: "/v1/imgs/**",
      },
    ],
  },
};

module.exports = nextConfig;
