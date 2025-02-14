import { defineConfig } from 'vite';
import glsl from 'vite-plugin-glsl';
import { createHtmlPlugin } from 'vite-plugin-html';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

export default defineConfig({
  root: 'src/', // Set the root directory for the app
  publicDir: '../static/', // Directory for static assets
  base: './', // Base path for the app

  server: {
    host: true, // Enable access from network devices
    open: true, // Open browser on server start
    port: 8000, // Port for the dev server
  },

  build: {
    outDir: '../dist', // Output directory for build files
    emptyOutDir: true, // Clean the output directory before building
    sourcemap: true, // Generate source maps
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/index.html'), // Entry point for the app
      },
    },
  },

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/js'), // Alias for JS directory
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern', // SCSS options
      },
    },
  },

  assetsInclude: ['**/*.fnt'], // Include font files as assets

  plugins: [
    createHtmlPlugin({
      minify: true, // Minify the HTML
    }),
    glsl(), // Handle GLSL shaders
    nodePolyfills(), // Polyfills for Node.js APIs
  ],
});
