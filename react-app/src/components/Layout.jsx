import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Topbar from './Topbar';
import Sidebar from './Sidebar';
import { useDeviceType } from '../hooks/useDeviceType';

export default function Layout() {
    const deviceType = useDeviceType();
    // Initialize from localStorage or default based on device type
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved !== null ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        if (saved === null) {
            setSidebarCollapsed(deviceType !== 'desktop');
        }
    }, [deviceType]);

    const toggleSidebar = () => {
        setSidebarCollapsed(prev => {
            const next = !prev;
            localStorage.setItem('sidebarCollapsed', JSON.stringify(next));
            return next;
        });
    };

    return (
        <div className={`app-container device-${deviceType}`}>
            {/* Overlay when sidebar open on mobile/tablet */}
            {!sidebarCollapsed && deviceType !== 'desktop' && (
                <div className="sidebar-overlay" onClick={toggleSidebar} />
            )}

            {/* Pass correct prop name: Topbar uses onToggleSidebar */}
            <Topbar onToggleSidebar={toggleSidebar} />

            <div className="app-body">
                <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />

                {/* main-content: margin matches sidebar width */}
                <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''} ${deviceType}-view`}>
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
