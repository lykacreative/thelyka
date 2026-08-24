/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
