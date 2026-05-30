// NextConfig gives TypeScript awareness of valid Next.js configuration keys.
import type { NextConfig } from "next";

// Phase 1 keeps the framework configuration intentionally small.
// We can add image domains, redirects, or server options later when a real
// feature needs them.
const nextConfig: NextConfig = {
  // React Compiler is enabled by the scaffold for safer automatic optimization.
  reactCompiler: true,
};

// Next.js reads this default export when it starts the dev server or builds.
export default nextConfig;
