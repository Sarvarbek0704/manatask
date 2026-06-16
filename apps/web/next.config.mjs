import { fileURLToPath } from 'url';
import path from 'path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @manatask/shared ships compiled JS; transpile in case it's consumed as TS.
  transpilePackages: ['@manatask/shared'],
  // Standalone build for small Docker images; trace from the monorepo root.
  output: 'standalone',
  experimental: { outputFileTracingRoot: root },
};

export default nextConfig;
