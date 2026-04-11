/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "bcryptjs"],
};
module.exports = nextConfig;
