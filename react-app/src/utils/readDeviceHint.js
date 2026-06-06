/**
 * Frontend Device Hint Utility
 * Reads and persists server-side device detection hints
 */

/**
 * PART 4 — Frontend utility to READ the backend hint
 * Extracts the X-Device-Type header and persists it to sessionStorage
 */

/**
 * Reads the device type hint from a Fetch API response object
 * @param {Response} response - The fetch response object
 */
export const getBackendDeviceHint = (response) => {
    if (!response || !response.headers) return null;
    
    const hint = response.headers.get('x-device-type');
    if (hint) {
        storeDeviceHint(hint);
    }
    return hint;
};

/**
 * Stores the server-provided device hint in sessionStorage
 * @param {string} hint - 'mobile' | 'tablet' | 'desktop'
 */
export const storeDeviceHint = (hint) => {
    if (hint) {
        sessionStorage.setItem('server_device_hint', hint);
    }
};

export default {
    getBackendDeviceHint,
    storeDeviceHint
};
