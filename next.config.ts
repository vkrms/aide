import type { NextConfig } from 'next';
import { codeInspectorPlugin } from 'code-inspector-plugin';

const nextConfig: NextConfig = {
    // grammY works best in the Node.js runtime (not Edge)
    serverExternalPackages: ['grammy'],
    turbopack: {
        rules: codeInspectorPlugin({
            bundler: 'turbopack',
        }),
    },
};

export default nextConfig;
