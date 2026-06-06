import React, { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { DeviceProvider, useDevice } from './context/DeviceContext'

/**
 * DeviceAttributeSetter
 * Internal component to handle the side-effect of setting the data-device 
 * attribute on the document element for global CSS targeting.
 */
function DeviceAttributeSetter() {
  const { device } = useDevice();

  useEffect(() => {
    if (device) {
      document.documentElement.setAttribute('data-device', device);
    }
  }, [device]);

  return null;
}

// Global visual error catcher for any remaining runtime issues
window.onerror = function (msg, url, line, col, error) {
  console.error('SYSTEM ERROR:', msg, 'at', url, ':', line, ':', col, error);
  const errorBox = document.createElement('div');
  errorBox.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:1.5rem;z-index:999999;font-family:monospace;white-space:pre-wrap;box-shadow:0 10px 30px rgba(0,0,0,0.5);';
  errorBox.innerHTML = `<h3 style="margin:0 0 0.5rem">System: Initialization Error</h3>
                       <p>${msg}</p>
                       <div style="font-size:0.75rem;opacity:0.7">File: ${url}:${line}</div>`;
  document.body.prepend(errorBox);
};

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found!');

  createRoot(rootElement).render(
    <StrictMode>
      <DeviceProvider>
        <DeviceAttributeSetter />
        <App />
      </DeviceProvider>
    </StrictMode>
  );
} catch (e) {
  console.error('CRITICAL BOOT ERROR:', e);
}
