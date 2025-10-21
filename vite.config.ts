
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
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
            // Vendor chunks - Core libraries
            if (id.includes('node_modules')) {
              // Socket.io - completely independent
              if (id.includes('socket.io')) {
                return 'vendor-socket';
              }

              // Everything else goes into ONE big vendor bundle
              // This prevents circular dependency issues
              return 'vendor';
            }

            // Page chunks - Force separate bundles for key pages
            if (id.includes('/src/pages/Settings')) {
              return 'page-settings';
            }
            if (id.includes('/src/pages/MessagesNew')) {
              return 'page-messages';
            }

            // Application chunks - Split by feature
            if (id.includes('/src/components/messaging/')) {
              return 'feature-messaging';
            }
            if (id.includes('/src/components/analytics/')) {
              return 'feature-analytics';
            }
            if (id.includes('/src/components/collaboration/')) {
              return 'feature-collaboration';
            }
            if (id.includes('/src/components/onboarding/')) {
              return 'feature-onboarding';
            }
            if (id.includes('/src/components/portfolio/')) {
              return 'feature-portfolio';
            }
            if (id.includes('/src/components/project/')) {
              return 'feature-project';
            }
            if (id.includes('/src/components/performance/')) {
              return 'feature-performance';
            }

            // UI components - Shared across features
            if (id.includes('/src/components/ui/')) {
              return 'shared-ui';
            }

            // Services and utilities
            if (id.includes('/src/services/')) {
              return 'shared-services';
            }
            if (id.includes('/src/utils/')) {
              return 'shared-utils';
            }

            // Contexts
            if (id.includes('/src/contexts/')) {
              return 'shared-contexts';
            }
          },
          // Optimize chunk naming
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        }
      },
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: false, // Keep console logs for debugging
          drop_debugger: true,
          pure_funcs: [], // Don't remove any console functions
          passes: 2, // Run minification twice for better results
        },
        mangle: {
          safari10: true, // Safari 10 compatibility
        },
      },
      chunkSizeWarningLimit: 500, // Warn for chunks > 500KB
      reportCompressedSize: true,
      sourcemap: false, // Disable sourcemaps in production for smaller bundles
    },
    server: {
      port: 5173,
      host: true, // Allow access from external IPs
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  });