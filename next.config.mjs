/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/dgow1oztd/**",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/sketches",
        destination: "/arts",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
