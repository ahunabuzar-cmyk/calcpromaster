// Vitest config — scoped to unit tests only.
// Playwright specs under tests/e2e + tests/visual use test.describe() and must
// run via `npm run test:e2e` / `test:visual`, not vitest.
const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node'
  }
});
