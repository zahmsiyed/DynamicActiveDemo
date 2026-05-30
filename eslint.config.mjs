// ESLint checks code quality before changes are considered done.
import { defineConfig, globalIgnores } from "eslint/config";

// Core Web Vitals rules catch common Next.js performance and accessibility issues.
import nextVitals from "eslint-config-next/core-web-vitals";

// TypeScript rules catch mistakes that plain JavaScript linting cannot see.
import nextTs from "eslint-config-next/typescript";

// `defineConfig` keeps the ESLint configuration typed and composable.
const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores from eslint-config-next so generated files stay out
  // of lint results.
  globalIgnores([
    // These folders/files are produced by builds or framework tooling.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

// ESLint reads this default export when `npm run lint` is executed.
export default eslintConfig;
