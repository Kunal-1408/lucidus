import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Resolves the path aliases declared in tsconfig.json, including the ones
  // added by `nest g library`. Requires Vite 8, which ships this option.
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['./test/global-setup.ts'],
    // Starting an in-memory MongoDB per e2e file can be slow on a busy runner.
    hookTimeout: 180_000,
  },
});
