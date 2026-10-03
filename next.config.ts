import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // The confidential-transfers client imports the Node build of the zk-sdk.
      // In the browser we serve the web build and initialise its WASM ourselves.
      "@solana/zk-sdk/node": { browser: "@solana/zk-sdk/web" },
    },
  },
};

export default nextConfig;
