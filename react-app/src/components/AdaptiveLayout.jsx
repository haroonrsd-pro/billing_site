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
  
  const userToggledRef = React.useRef(false);
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => isTablet ? isPortrait : false);

  // Sync with orientation for tablets only when orientation actually changes
  const lastOrientationRef = React.useRef(isPortrait);
  React.useEffect(() => {
    if (isTablet && lastOrientationRef.current !== isPortrait) {
      setSidebarCollapsed(isPortrait); // Default to collapsed in portrait on rotation
      lastOrientationRef.current = isPortrait;
      userToggledRef.current = false; // Reset toggle flag since orientation changed
    }
  }, [isTablet, isPortrait]);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
    userToggledRef.current = true;
  };

  // Common wrapper styles
  const shellClass = `app-shell app-shell--${device} ${deviceClass} ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`;

  // MOBILE SHELL
  if (isMobile) {
    return (
      <div className={shellClass} style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <Topbar variant="compact" />
        <main style={{ 
          flex: 1, 
          overflowY: 'auto', 
          paddingLeft: '0.75rem',
          paddingRight: '0.75rem',
          paddingTop: 'calc(56px + env(safe-area-inset-top, 0px) + 0.5cm)',
          paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' 
        }}>
          <Outlet />
        </main>
        <BottomNav />
      </div>
    );
  }

  // TABLET SHELL
  if (isTablet) {
    return (
      <div className={shellClass} style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>
        <Sidebar collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Topbar onToggleSidebar={toggleSidebar} />
          <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Outlet />
          </main>
        </div>
      </div>
    );
  }

  // DESKTOP SHELL (Default/Fallback)
  return (
    <div className={shellClass} style={{ display: 'flex', flexDirection: 'row', height: '100vh', overflow: 'hidden' }}>
      <Sidebar collapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar onToggleSidebar={toggleSidebar} />
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 2rem' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdaptiveLayout;
