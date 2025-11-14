import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack config (empty for now, using default behavior)
  // WebAssembly support should work out of the box in Turbopack
  turbopack: {},
  
  // Webpack config (for when using --webpack flag)
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Don't try to process mujoco-js on the server side at all
    if (isServer) {
      config.externals = [...(config.externals || []), "mujoco-js"];
      return config;
    }

    // For client side, resolve mujoco-js properly
    config.resolve.alias = {
      ...config.resolve.alias,
    };

    // Ignore import.meta.url warnings/errors from mujoco-js
    config.module.rules.push({
      test: /node_modules\/mujoco-js/,
      parser: {
        node: false,
      },
    });

    return config;
  },
};

export default nextConfig;
