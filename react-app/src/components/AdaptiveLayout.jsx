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
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => isTablet && isPortrait);

  // On orientation change: only auto-adjust if user hasn't manually toggled
  React.useEffect(() => {
    if (isTablet && !userToggledRef.current) {
      setSidebarCollapsed(isPortrait);
    }
    // Reset the manual-toggle flag when orientation changes
    userToggledRef.current = false;
  }, [isTablet, isPortrait]);

  const toggleSidebar = () => {
    userToggledRef.current = true;
    setSidebarCollapsed(prev => !prev);
  };

  // Common wrapper styles
  const shellClass = `app-shell app-shell--${device} ${deviceClass} ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`;


  // MOBILE & TABLET EMULATOR SHELL
  if (isMobile || isTablet) {
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
