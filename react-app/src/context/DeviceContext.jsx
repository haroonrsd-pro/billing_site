import React, { createContext, useContext, useMemo } from 'react';
import { useAdaptiveDevice } from '../hooks/useAdaptiveDevice';

/**
 * DeviceContext
 * Provides real-time device information globally across the application.
 */
const DeviceContext = createContext(null);

/**
 * DeviceProvider
 * High-level wrapper that provides device state using the useAdaptiveDevice hook.
 */
export function DeviceProvider({ children }) {
  const deviceState = useAdaptiveDevice();

  return (
    <DeviceContext.Provider value={deviceState}>
      {children}
    </DeviceContext.Provider>
  );
}

/**
 * useDevice
 * Custom hook to access the device state from DeviceContext.
 * Throws an error if used outside of <DeviceProvider>.
 */
export function useDevice() {
  const context = useContext(DeviceContext);
  if (context === null) {
    throw new Error('useDevice must be used inside <DeviceProvider>');
  }
  return context;
}

/**
 * useDeviceClass
 * Custom hook that returns a simplified CSS class string based on the current device.
 * Useful for conditional styling in components.
 */
export function useDeviceClass() {
  const { device } = useDevice();

  return useMemo(() => {
    switch (device) {
      case 'mobile':
        return 'device-mobile touch-device';
      case 'tablet':
        return 'device-tablet touch-device';
      case 'desktop':
        return 'device-desktop';
      default:
        return '';
    }
  }, [device]);
}
