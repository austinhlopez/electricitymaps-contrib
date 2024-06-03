/// <reference types="vitest" />
import eslintPlugin from '@nabla/vite-plugin-eslint';
import { sentryVitePlugin, SentryVitePluginOptions } from '@sentry/vite-plugin';
import react from '@vitejs/plugin-react';
import jotaiDebugLabel from 'jotai/babel/plugin-debug-label';
import jotaiReactRefresh from 'jotai/babel/plugin-react-refresh';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import tsconfigPaths from 'vite-tsconfig-paths';

const manualChunkMap = {
  '@sentry': 'sentry',
  '@radix-ui': 'radix',
  'country-flag-icons': 'flags',
  recharts: 'recharts',
  'world.json': 'world',
  'usa_states.json': 'config',
  'zones.json': 'config',
  'exchanges.json': 'config',
  'excluded_aggregated_exchanges.json': 'config',
};

const sentryPluginOptions: SentryVitePluginOptions = {
  org: 'electricitymaps',
  project: 'app-web',

  // Auth tokens can be obtained from https://sentry.io/settings/account/api/auth-tokens/
  // and needs the `project:releases` and `org:read` scopes
  authToken: process.env.SENTRY_AUTH_TOKEN,

  release: {
    // Optionally uncomment the line below to override automatic release name detection
    name: process.env.npm_package_version,
  },
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
    excludePerformanceMonitoring: true,
    excludeReplayIframe: true,
    excludeReplayShadowDom: true,
    excludeReplayWorker: true,
  },
};

export default defineConfig(({ mode }) => ({
  define: {
    APP_VERSION: JSON.stringify(process.env.npm_package_version),
  },
  server: { host: '127.0.0.1' },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          for (const [searchString, value] of Object.entries(manualChunkMap)) {
            if (id.includes(searchString)) {
              return value;
            }
          }
        },
      },
    },
  },
  treeshake: 'smallest',
  test: {
    css: false,
    include: ['{src,geo}/**/*.test.{ts,tsx}', 'scripts/*.test.{ts,tsx}'],
    globals: true,
    globalSetup: 'testSetup.ts',
    environment: 'jsdom',
    setupFiles: 'src/testing/setupTests.ts',
    clearMocks: true,
    coverage: {
      provider: 'istanbul',
      enabled: false,
      100: true,
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
  plugins: [
    tsconfigPaths(),
    react({
      babel: {
        plugins: [jotaiDebugLabel, jotaiReactRefresh],
      },
    }),
    ...(mode !== 'test'
      ? [
          eslintPlugin(),
          VitePWA({
            registerType: 'autoUpdate',
            workbox: {
              maximumFileSizeToCacheInBytes: 3_500_000,
              runtimeCaching: [
                {
                  urlPattern: ({ url }) => url.pathname.startsWith('/images/'),
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'images',
                    cacheableResponse: {
                      statuses: [200],
                    },
                  },
                },
              ],
            },
            includeAssets: ['robots.txt', 'fonts/**/*.{woff2, pbf}'],
            includeManifestIcons: true,
            manifest: {
              theme_color: '#000000',
              icons: [
                {
                  src: '/icons/android-chrome-192x192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any maskable',
                },
                {
                  src: '/icons/android-chrome-512x512.png',
                  sizes: '512x512',
                  type: 'image/png',
                },
              ],
            },
          }),
          // Used to upload sourcemaps to Sentry
          process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin(sentryPluginOptions),
        ]
      : []),
  ],
}));
