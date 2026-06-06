import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAdaptiveDevice Hook
 * Central device detection engine for FoodBill PRO.
 * Detects device type based on breakpoints, UA hints, orientation, and touch capabilities.
 */
export function useAdaptiveDevice() {
  const timerRef = useRef(null);

  const getDeviceProfile = useCallback(() => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    const ua = navigator.userAgent;

    // UA Hints
    let uaHint = 'desktop';
    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(ua)) {
      uaHint = 'tablet';
    } else if (/Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
      uaHint = 'mobile';
    }

    // Breakpoints (window.innerWidth ALWAYS wins)
    let device = 'desktop';
    if (width < 768) {
      device = 'mobile';
    } else if (width >= 768 && width <= 1024) {
      device = 'tablet';
    }

    const serverHint = sessionStorage.getItem('server_device_hint');
    if (((width >= 748 && width <= 788) || (width >= 1004 && width <= 1044)) && serverHint) {
      device = serverHint;
    }

    const isMobile = device === 'mobile';
    const isTablet = device === 'tablet';
    const isDesktop = device === 'desktop';

    // Capabilities & Orientation
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isPortrait = height > width;
    const isLandscape = !isPortrait;
    const isRetina = dpr >= 2;

    return {
      device,
      isMobile,
      isTablet,
      isDesktop,
      isTouchDevice,
      isPortrait,
      isLandscape,
      width,
      height,
      dpr,
      isRetina,
      uaHint,
      serverHint,
    };
  }, []);

  const [deviceProfile, setDeviceProfile] = useState(() => getDeviceProfile());

  useEffect(() => {
    const handleResize = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      timerRef.current = setTimeout(() => {
        setDeviceProfile(getDeviceProfile());
      }, 150); // 150ms Debounce
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [getDeviceProfile]);

  return deviceProfile;
}
