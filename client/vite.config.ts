import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      '.trycloudflare.com',
      '.ngrok-free.app',
      '.ngrok-free.dev',
      '.ngrok.app',
      'localhost',
      '127.0.0.1'
    ]
  }
});
