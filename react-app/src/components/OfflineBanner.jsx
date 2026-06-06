import React, { useState, useEffect } from 'react';

export default function OfflineBanner({ pendingCount = 0 }) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [showOnlineFlash, setShowOnlineFlash] = useState(false);
    const [showOfflineFlash, setShowOfflineFlash] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);

    useEffect(() => {
        let timer;
        let offlineTimer;

        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            offlineTimer = setTimeout(() => {
                setShowOfflineFlash(false);
            }, 5000);
        }

        const handleOffline = () => {
            setIsOnline(false);
            setShowOnlineFlash(false);
            setShowOfflineFlash(true);
            
            if (offlineTimer) clearTimeout(offlineTimer);
            offlineTimer = setTimeout(() => {
                setShowOfflineFlash(false);
            }, 5000);
        };

        const handleOnline = () => {
            setIsOnline(true);
            setShowOnlineFlash(true);
            setShowOfflineFlash(false);
            
            if (offlineTimer) clearTimeout(offlineTimer);
            
            // Auto dismiss the online flash after 3 seconds
            timer = setTimeout(() => {
                setShowOnlineFlash(false);
            }, 3000);
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
            if (timer) clearTimeout(timer);
            if (offlineTimer) clearTimeout(offlineTimer);
        };
    }, []);

    if (isOnline && !showOnlineFlash) {
        return null;
    }

    if (!isOnline && showOfflineFlash) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#1f2937', 
                color: '#f9fafb',
                padding: '8px 16px',
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: '600',
                zIndex: 99999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
                <span style={{ fontSize: '1.1em' }}>⚠️</span>
                <span>You are offline. Data is cached and will sync automatically.</span>
                {pendingCount > 0 && (
                    <span style={{
                        background: '#374151',
                        padding: '2px 6px',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        marginLeft: '8px'
                    }}>
                        {pendingCount} pending {pendingCount === 1 ? 'write' : 'writes'}
                    </span>
                )}
            </div>
        );
    }

    if (showOnlineFlash) {
        return (
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                backgroundColor: '#10b981', 
                color: 'white',
                padding: '8px 16px',
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: '600',
                zIndex: 99999,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                animation: 'slideDown 0.3s ease-out'
            }}>
                <span style={{ fontSize: '1.1em' }}>✅</span>
                <span>Back online! Synchronizing data...</span>
            </div>
        );
    }

    return null;
}
