// NextConfig gives TypeScript awareness of valid Next.js configuration keys.
import type { NextConfig } from "next";

// Keep framework configuration intentionally small until a feature needs image
// domains, redirects, or custom server options.
const nextConfig: NextConfig = {
  // React Compiler is enabled by the scaffold for safer automatic optimization.
  reactCompiler: true,
};

// Next.js reads this default export when it starts the dev server or builds.
export default nextConfig;
