import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { useDeviceType } from '../hooks/useDeviceType';

export default function Layout() {
    const deviceType = useDeviceType();
    const [sidebarCollapsed, setSidebarCollapsed] = useState(deviceType !== 'desktop');

    // Auto-collapse on mobile/tablet
    useEffect(() => {
        setSidebarCollapsed(deviceType !== 'desktop');
    }, [deviceType]);

    const toggleSidebar = () => {
        setSidebarCollapsed(!sidebarCollapsed);
    };

    return (
        <div className={`app-container device-${deviceType}`}>
            {/* Sidebar overlay for mobile/tablet */}
            {!sidebarCollapsed && deviceType !== 'desktop' && (
                <div className="sidebar-overlay" onClick={toggleSidebar}></div>
            )}

            <Topbar toggleSidebar={toggleSidebar} />

            <div className="app-body">
                <Sidebar collapsed={sidebarCollapsed} />

                {/* Main Content Area */}
                <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''} ${deviceType}-view`}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
