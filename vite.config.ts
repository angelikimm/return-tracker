import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/return-tracker/', // 👈 ADD THIS LINE

  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Return Tracker',
        short_name: 'Return Tracker',
        theme_color: '#f9fafb',
        background_color: '#f9fafb',
        display: 'standalone',
        icons: [
          {
            src: '/return-tracker/icon-192.png', // 👈 FIX THIS
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/return-tracker/icon-512.png', // 👈 FIX THIS
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
    }),
  ],
});
