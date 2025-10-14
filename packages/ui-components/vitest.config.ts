import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@talent-setu/ui-tokens': path.resolve(__dirname, '../ui-tokens/dist/index.js'),
    },
  },
});
