import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // Thư mục gốc chứa các file HTML
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tax: resolve(__dirname, 'tax.html'),
      }
    }
  }
});
