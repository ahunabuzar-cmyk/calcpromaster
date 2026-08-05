import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // The shared calculator dataset + runtime live in the vanilla project root (../js).
    // Aliasing keeps imports stable and lets webpack trace them for both client + server.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@calcpro-js': path.resolve(__dirname, '../js'),
    };

    // ---- Critical: vanilla CJS files vs dev react-refresh ----
    // Next.js dev's SWC react-refresh transform appends `import.meta.webpackHot.accept()`
    // to modules it compiles. Our shared files (../js/core.js, ../js/data/*.js) are
    // CommonJS, so webpack parses them as CJS and `import.meta` is a parse error
    // ("Cannot use 'import.meta' outside a module") → every tool page 500s in dev.
    // `type: 'javascript/auto'` allows both module systems, so the injected
    // `import.meta.webpackHot.accept()` parses and resolves via HMR plugin.
    // Production builds are unaffected (no refresh transform runs there).
    config.module.rules.push({
      test: /\.js$/,
      include: [path.resolve(__dirname, '../js')],
      type: 'javascript/auto',
    });

    return config;
  },
};

export default nextConfig;
