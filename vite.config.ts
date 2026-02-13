
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import { VitePWA } from 'vite-plugin-pwa';
  import path from 'path';

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
            // Vendor chunks - Split by library for better caching
            // NOTE: Specific library checks MUST come before the generic 'react' check
            // because many packages contain 'react' in their path
            if (id.includes('node_modules')) {
              // Socket.io - completely independent, no React dependency
              if (id.includes('socket.io-client') || id.includes('engine.io')) {
                return 'vendor-socket';
              }

              // Recharts and D3 - large charting libraries (loaded lazily)
              if (id.includes('recharts') || id.includes('d3-')) {
                return 'vendor-charts';
              }

              // Lodash (recharts transitive dep)
              if (id.includes('lodash')) {
                return 'vendor-charts';
              }

              // Decimal.js (recharts dep)
              if (id.includes('decimal.js')) {
                return 'vendor-charts';
              }

              // Date utilities - date-fns, dayjs, moment
              if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) {
                return 'vendor-dates';
              }

              // Export/document processing deps (canvg, html2canvas, pako, etc.)
              if (id.includes('canvg') || id.includes('html2canvas') || id.includes('pako') ||
                  id.includes('iobuffer') || id.includes('fast-png') || id.includes('fflate') ||
                  id.includes('rgbcolor') || id.includes('stackblur') || id.includes('svg-pathdata')) {
                return 'vendor-docs';
              }

              // Core-js polyfills (canvg/jsPDF transitive dep)
              if (id.includes('core-js')) {
                return 'vendor-docs';
              }

              // PDF/Document processing
              if (id.includes('pdf') || id.includes('docx') || id.includes('xlsx')) {
                return 'vendor-docs';
              }

              // Grid layout (used only by DraggableWidgetGrid)
              if (id.includes('react-grid-layout') || id.includes('react-draggable') ||
                  id.includes('react-resizable') || id.includes('resize-observer-polyfill')) {
                return 'vendor-grid';
              }

              // Prop-types and react-is (react-grid-layout transitive)
              if (id.includes('prop-types') || id.includes('react-is')) {
                return 'vendor-grid';
              }

              // Fuzzy search
              if (id.includes('fuse.js')) {
                return 'vendor-search';
              }

              // Editor libraries - Monaco, CodeMirror, TipTap
              if (id.includes('monaco') || id.includes('codemirror') || id.includes('@tiptap') || id.includes('prosemirror')) {
                return 'vendor-editor';
              }

              // Animation libraries
              if (id.includes('framer-motion') || id.includes('gsap') || id.includes('animejs')) {
                return 'vendor-animation';
              }

              // Three.js and 3D - large, load on demand
              if (id.includes('three') || id.includes('@react-three')) {
                return 'vendor-3d';
              }

              // Floating UI positioning (Radix UI dependency)
              if (id.includes('@floating-ui') || id.includes('floating-ui')) {
                return 'vendor-radix';
              }

              // Radix UI primitives (substantial size)
              if (id.includes('@radix-ui')) {
                return 'vendor-radix';
              }

              // Form libraries
              if (id.includes('react-hook-form') || id.includes('zod') || id.includes('yup')) {
                return 'vendor-forms';
              }

              // Query/State management
              if (id.includes('@tanstack') || id.includes('zustand') || id.includes('immer')) {
                return 'vendor-state';
              }

              // Yjs and collaboration libraries
              if (id.includes('yjs') || id.includes('y-websocket') || id.includes('y-indexeddb') || id.includes('y-prosemirror') || id.includes('y-protocols') || id.includes('lib0')) {
                return 'vendor-collab';
              }

              // HTTP clients
              if (id.includes('axios')) {
                return 'vendor-http';
              }

              // Icons - lucide is large
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }

              // i18n - internationalization
              if (id.includes('i18next') || id.includes('react-i18next')) {
                return 'vendor-i18n';
              }

              // Stripe - payment processing
              if (id.includes('stripe')) {
                return 'vendor-stripe';
              }

              // Drag and drop
              if (id.includes('@dnd-kit')) {
                return 'vendor-dnd';
              }

              // Chart.js (separate from recharts)
              if (id.includes('chart.js') || id.includes('react-chartjs')) {
                return 'vendor-charts';
              }

              // 3D/Spring animation libraries
              if (id.includes('@react-spring') || id.includes('@use-gesture') || id.includes('react-reconciler')) {
                return 'vendor-animation';
              }

              // ShadCN UI utilities
              if (id.includes('class-variance-authority') || id.includes('clsx') || id.includes('tailwind-merge') ||
                  id.includes('cmdk') || id.includes('sonner') || id.includes('vaul') ||
                  id.includes('embla-carousel') || id.includes('input-otp') || id.includes('next-themes') ||
                  id.includes('react-day-picker') || id.includes('react-dropzone') ||
                  id.includes('react-remove-scroll') || id.includes('react-style-singleton')) {
                return 'vendor-ui-utils';
              }

              // Google OAuth
              if (id.includes('@react-oauth') || id.includes('react-oauth')) {
                return 'vendor-common';
              }

              // React ecosystem - MUST stay together to avoid context errors
              // This check comes AFTER specific libraries so react-hook-form, lucide-react,
              // react-i18next, @react-three etc. go to their own chunks
              if (id.includes('/react-dom/') || id.includes('/react/') || id.includes('/react-router') || id.includes('/scheduler/')) {
                return 'vendor-react';
              }

              // Everything else goes into a smaller vendor-common bundle
              return 'vendor-common';
            }

            // IMPORTANT: Fix circular dependencies by NOT splitting these into separate chunks
            // Services, contexts, and hooks are tightly coupled - keep them together
            // Pages that are frequently accessed together should NOT be in separate chunks

            // Heavy pages that should be their own chunks (lazy loaded)
            if (id.includes('/src/pages/ToolsMetMap')) {
              return 'page-metmap';
            }
            if (id.includes('/src/pages/ProjectOverview') || id.includes('/src/pages/ProjectDetail')) {
              return 'page-project-detail';
            }
            if (id.includes('/src/pages/Settings')) {
              return 'page-settings';
            }

            // Large dashboard components
            if (
              id.includes('/src/components/dashboard/') ||
              id.includes('/src/components/widgets/') ||
              id.includes('/src/components/AdaptiveDashboard')
            ) {
              return 'feature-dashboard';
            }

            // Printing dashboard (large, rarely used)
            if (id.includes('/src/components/printing/')) {
              return 'feature-printing';
            }

            // Onboarding flow (only used for new users)
            if (id.includes('/src/components/onboarding/')) {
              return 'feature-onboarding';
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