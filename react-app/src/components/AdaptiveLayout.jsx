import React from 'react';
import { Outlet } from 'react-router-dom';
import { useDevice, useDeviceClass } from '../context/DeviceContext';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import BottomNav from './BottomNav';

/**
 * AdaptiveLayout Component
 * Main layout wrapper that renders different shells based on device type.
 * Orchestrates Sidebar, Topbar, BottomNav, and Main Content.
 */
const AdaptiveLayout = () => {
  const { device, isMobile, isTablet, isDesktop, isPortrait } = useDevice();
  const deviceClass = useDeviceClass();
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(true);

  // Sync with orientation for tablets only when orientation actually changes
  const lastOrientationRef = React.useRef(isPortrait);
  React.useEffect(() => {
    if (isTablet && lastOrientationRef.current !== isPortrait) {
      setSidebarCollapsed(true); // Default to collapsed on rotation
      lastOrientationRef.current = isPortrait;
    }
  }, [isTablet, isPortrait]);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  // Common wrapper styles
  const shellClass = `app-shell app-shell--${device} ${deviceClass}`;

  // MOBILE & TABLET SHELL
  if (isMobile || isTablet) {
    return (
      <div className={shellClass} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Topbar variant="compact" />
        <main style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' }}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    );
  }

  // DESKTOP SHELL (Default/Fallback)
  return (
    <div className={shellClass} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Topbar />
      <div className="app-body">
        <Sidebar collapsed={false} />
        <main className="main-content" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdaptiveLayout;
