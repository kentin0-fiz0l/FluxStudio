
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import { VitePWA } from 'vite-plugin-pwa';
  import compression from 'vite-plugin-compression';
  import path from 'path';

  const isAnalyze = process.env.ANALYZE === 'true';

  export default defineConfig({
    plugins: [
      react(),
      VitePWA({
        registerType: 'prompt',
        injectRegister: false, // We register manually in main.tsx
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https?:\/\/.*\/api\//,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60, // 1 hour
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 200,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              urlPattern: /\.(?:woff2?|ttf|eot)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'font-cache',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
        },
        manifest: {
          name: 'FluxStudio',
          short_name: 'Flux',
          description: 'Creative collaboration platform',
          theme_color: '#3b82f6',
          background_color: '#0f172a',
          display: 'standalone',
          start_url: '/',
          icons: [
            { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          ],
        },
      }),
      // Gzip + Brotli pre-compression for production builds
      compression({ algorithm: 'gzip', ext: '.gz', threshold: 1024 }),
      compression({ algorithm: 'brotliCompress', ext: '.br', threshold: 1024 }),
      // Bundle visualizer — run with ANALYZE=true vite build
      ...(isAnalyze ? [
        (async () => {
          const { visualizer } = await import('rollup-plugin-visualizer');
          return visualizer({ open: true, filename: 'build/stats.html', gzipSize: true, brotliSize: true }) as unknown as import('vite').Plugin;
        })()
      ] : []),
    ],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'next-themes@0.4.6': 'next-themes',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'figma:asset/77df102c051da8e4526d9646379eb0536120af9a.png': path.resolve(__dirname, './src/assets/77df102c051da8e4526d9646379eb0536120af9a.png'),
        'figma:asset/128e5611c12549cded97c5e071b8c30cbaf7c018.png': path.resolve(__dirname, './src/assets/128e5611c12549cded97c5e071b8c30cbaf7c018.png'),
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Vendor chunk splitting strategy:
            // Only manually chunk packages with ZERO React dependency.
            // All React-dependent packages fall through to Rollup's automatic
            // splitting to avoid circular chunk dependencies.
            if (id.includes('node_modules')) {
              // === Pure packages (no React dependency) ===

              // Socket.io - WebSocket transport
              if (id.includes('socket.io-client') || id.includes('engine.io')) {
                return 'vendor-socket';
              }

              // Recharts — let Rollup handle naturally.
              // Recharts depends on React, so manual chunking creates
              // circular dependencies with page-project-detail and feature-analytics.

              // Three.js + React Three Fiber — let Vite's natural code splitting handle this.
              // Manual chunking creates circular dependency chains with page-project-detail
              // and vendor-tiptap. The React.lazy() import in FormationEditor already ensures
              // Three.js is only loaded when the 3D view is activated.

              // D3, Lodash, Decimal.js, Chart.js - pure data/math/charting
              if (id.includes('d3-') || id.includes('lodash') || id.includes('decimal.js') ||
                  (id.includes('chart.js') && !id.includes('react-chartjs'))) {
                return 'vendor-charts';
              }

              // Date utilities
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'vendor-dates';
              }

              // Document/export processing (canvg, html2canvas, pako, pdf, etc.)
              if (id.includes('canvg') || id.includes('html2canvas') || id.includes('pako') ||
                  id.includes('iobuffer') || id.includes('fast-png') || id.includes('fflate') ||
                  id.includes('rgbcolor') || id.includes('stackblur') || id.includes('svg-pathdata') ||
                  id.includes('core-js') || id.includes('pdf') || id.includes('docx') || id.includes('xlsx')) {
                return 'vendor-docs';
              }

              // Fuzzy search
              if (id.includes('fuse.js')) {
                return 'vendor-search';
              }

              // Editor libraries (Monaco, CodeMirror, ProseMirror core)
              if (id.includes('monaco') || id.includes('codemirror') || id.includes('prosemirror')) {
                return 'vendor-editor';
              }

              // Yjs collaboration (CRDT, no React dependency)
              if (id.includes('yjs') || id.includes('y-websocket') || id.includes('y-indexeddb') ||
                  id.includes('y-prosemirror') || id.includes('y-protocols') || id.includes('lib0')) {
                return 'vendor-collab';
              }

              // Pure CSS/class utilities
              if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge')) {
                return 'vendor-ui-utils';
              }

              // Zod - pure validation schema (no React dependency)
              if (id.includes('zod')) {
                return 'vendor-validation';
              }

              // Yup / react-hook-form related (no React dependency for yup)
              if (id.includes('yup')) {
                return 'vendor-forms';
              }

              // HTTP clients
              if (id.includes('axios')) {
                return 'vendor-http';
              }

              // i18n — let Rollup handle naturally.
              // react-i18next depends on React, so manual chunking creates
              // circular dependencies with feature-admin and page-project-detail.

              // Framer Motion (animation library, can defer)
              if (id.includes('framer-motion') || id.includes('popmotion')) {
                return 'vendor-motion';
              }

              // TipTap — let Rollup handle naturally.
              // @tiptap/react depends on React, so manual chunking creates
              // circular dependencies with page-project-detail.

              // === All other node_modules (including React-dependent ones) ===
              // Let Rollup handle placement to avoid circular dependencies.
              // This includes: react, react-dom, recharts, framer-motion, radix-ui,
              // tanstack, zustand, lucide-react, dnd-kit, i18next, stripe, etc.
              return;
            }

            // IMPORTANT: Fix circular dependencies by NOT splitting these into separate chunks
            // Services, contexts, and hooks are tightly coupled - keep them together
            // Pages that are frequently accessed together should NOT be in separate chunks

            // Heavy pages that should be their own chunks (lazy loaded)
            if (id.includes('/src/pages/MessagesNew')) {
              return 'page-messages';
            }
            if (id.includes('/src/pages/ToolsMetMap')) {
              return 'page-metmap';
            }
            if (id.includes('/src/pages/ProjectOverview') || id.includes('/src/pages/ProjectDetail')) {
              return 'page-project-detail';
            }
            if (id.includes('/src/pages/Settings')) {
              return 'page-settings';
            }

            // Dashboard components (split from widgets for smaller chunks)
            if (id.includes('/src/components/dashboard/')) {
              return 'feature-dashboard';
            }

            // Widget components (lazy-loaded heavy widgets split further via dynamic imports in registry.ts)
            if (id.includes('/src/components/widgets/')) {
              return 'feature-widgets';
            }

            // Printing dashboard (large, rarely used)
            if (id.includes('/src/components/printing/')) {
              return 'feature-printing';
            }

            // Onboarding flow — split into sub-chunks
            // Note: No catch-all for /onboarding/ — shared files (OnboardingStep,
            // OnboardingProgress, onboardingTypes) are inlined into the client chunk
            // by Rollup. A catch-all created a circular chunk dependency with
            // feature-admin (Radix UI primitives vs React/ReactDOM) causing TDZ errors.
            if (id.includes('/src/components/onboarding/ClientOnboarding')) {
              return 'feature-onboarding-client';
            }
            if (id.includes('/src/components/onboarding/QuickOnboarding')) {
              return 'feature-onboarding-quick';
            }
            if (id.includes('/src/components/onboarding/ProductTour')) {
              return 'feature-onboarding-tour';
            }

            // Admin pages (rarely accessed)
            if (id.includes('/src/pages/admin/')) {
              return 'feature-admin';
            }

            // Analytics components (dashboard widgets)
            if (id.includes('/src/components/analytics/')) {
              return 'feature-analytics';
            }

            // Collaboration components (uses Yjs)
            if (id.includes('/src/components/collaboration/')) {
              return 'feature-collaboration';
            }

            // Portfolio components
            if (id.includes('/src/components/portfolio/')) {
              return 'feature-portfolio';
            }

            // Keep UI, services, contexts, hooks, and messaging together in the main bundle
            // to avoid circular dependency issues
            return undefined; // Let Rollup handle these naturally
          },
          // Optimize chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        }
      },
      minify: 'esbuild', // Use esbuild (faster than terser and already included)
      // esbuild minification is faster and produces similar results to terser
      // Removed terser dependency to reduce build complexity
      chunkSizeWarningLimit: 500, // Warn for chunks > 500KB
      reportCompressedSize: true,
      sourcemap: false, // Disable sourcemaps in production for smaller bundles
      cssCodeSplit: true, // Split CSS per chunk for smaller initial load
    },
    server: {
      port: 5173,
      host: true, // Allow access from external IPs
      open: true,
      proxy: {
        '/api/messaging': {
          target: 'http://localhost:3004',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/auth': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  });