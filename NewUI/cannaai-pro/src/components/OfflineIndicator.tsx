import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showIndicator, setShowIndicator] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowIndicator(true);
      
      // Trigger sync if needed
      triggerSync();
      
      // Hide indicator after delay
      setTimeout(() => {
        setShowIndicator(false);
      }, 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowIndicator(true);
    };

    const triggerSync = async () => {
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        setIsSyncing(true);
        
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.sync.register('background-sync');
          
          // Simulate sync delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          console.log('Background sync completed');
        } catch (error) {
          console.error('Background sync failed:', error);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Show initial indicator if offline
    if (!navigator.onLine) {
      setShowIndicator(true);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show anything if online and not recently reconnected
  if (isOnline && !showIndicator) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        exit={{ y: -100 }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className={`fixed top-16 left-0 right-0 z-50 flex items-center justify-center p-2 ${
          isOnline ? 'bg-emerald-600' : 'bg-red-600'
        }`}
      >
        <div className="flex items-center gap-2 text-white text-sm font-medium">
          {isSyncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : isOnline ? (
            <Wifi className="w-4 h-4" />
          ) : (
            <WifiOff className="w-4 h-4" />
          )}
          
          <span>
            {isSyncing
              ? 'Syncing data...'
              : isOnline
              ? 'Back online'
              : 'You are offline - some features may not work'}
          </span>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OfflineIndicator;
