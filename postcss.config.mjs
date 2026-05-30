// PostCSS runs CSS transforms after Next.js reads our CSS files.
const config = {
  // This plugin is what lets Tailwind v4 generate utility classes from CSS.
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

// Next.js automatically picks up this config during development and builds.
export default config;
