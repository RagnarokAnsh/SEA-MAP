// Only used by `npm run preview` - the local playground for clicking through
// the quiz. Nothing here ships. Tests use vitest.config.ts.
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'preview',
  plugins: [react()],
  server: { port: 5180, open: true },
});
