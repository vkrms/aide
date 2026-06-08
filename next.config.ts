import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
    // grammY works best in the Node.js runtime (not Edge)
    serverExternalPackages: ['grammy'],
};

export default nextConfig;
