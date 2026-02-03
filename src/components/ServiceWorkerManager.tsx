import { useEffect, useState } from 'react';
import { X, WifiOff, Download } from 'lucide-react';
import { Button } from './ui/button';

export function ServiceWorkerManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // TEMPORARILY DISABLED: Service worker registration causes caching issues in development
    // To re-enable, check for development environment and call registerServiceWorker()

    // Handle online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Note: Service worker registration temporarily disabled - see useEffect

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    }
  };

  const handleUpdateApp = () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  };

  return (
    <>
      {/* Online/Offline Status Indicator */}
      <div className={`
        fixed top-16 right-4 z-50 
        transition-all duration-300 ease-in-out
        ${isOnline ? 'translate-y-[-100px] opacity-0' : 'translate-y-0 opacity-100'}
      `}>
        <div 
          className="flex items-center space-x-2 px-4 py-2 rounded-lg"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%), rgba(239, 68, 68, 0.9)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <WifiOff className="h-4 w-4 text-white" />
          <span className="text-white text-sm font-medium">Offline</span>
        </div>
      </div>


      {/* PWA Install Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <div 
            className="p-4 rounded-lg shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%), rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
                  <Download className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Install Flux Studio
                </p>
                <p className="text-xs text-white/70 mt-1">
                  Get quick access and work offline
                </p>
              </div>
              <div className="flex-shrink-0 flex space-x-2">
                <Button
                  size="sm"
                  className="btn-glass-gradient text-white text-xs px-3 py-1"
                  onClick={handleInstallApp}
                >
                  Install
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white p-1"
                  onClick={() => setShowInstallPrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
          <div 
            className="p-4 rounded-lg shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.05) 100%), rgba(10, 10, 10, 0.95)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-green-500 flex items-center justify-center">
                  <Download className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white">
                  Update Available
                </p>
                <p className="text-xs text-white/70 mt-1">
                  New features and improvements
                </p>
              </div>
              <div className="flex-shrink-0 flex space-x-2">
                <Button
                  size="sm"
                  className="btn-glass-gradient text-white text-xs px-3 py-1"
                  onClick={handleUpdateApp}
                >
                  Update
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/60 hover:text-white p-1"
                  onClick={() => setShowUpdatePrompt(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}