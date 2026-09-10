import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'preview',
  plugins: [react()],
  server: { port: 5180, open: true },
});
