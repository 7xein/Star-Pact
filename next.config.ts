import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@prisma/adapter-better-sqlite3'],
  allowedDevOrigins: ['192.168.1.102'],
};

export default nextConfig;
