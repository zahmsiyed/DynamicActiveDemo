// NextConfig gives TypeScript awareness of valid Next.js configuration keys.
import type { NextConfig } from "next";

// Keep framework configuration intentionally small until a feature needs image
// domains, redirects, or custom server options.
const nextConfig: NextConfig = {
  // React Compiler is enabled by the scaffold for safer automatic optimization.
  reactCompiler: true,
  // The Vercel serverless bundle needs the seeded SQLite template so runtime
  // code can copy it into writable /tmp storage before Prisma connects.
  outputFileTracingIncludes: {
    "/*": ["./prisma/seed.db"],
  },
};

// Next.js reads this default export when it starts the dev server or builds.
export default nextConfig;
