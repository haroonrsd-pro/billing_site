/**
 * Device Detection Utility for Firebase Cloud Functions
 * FoodBill PRO Backend
 */

/**
 * PART 1 — Core detection function
 * Parses User-Agent string to identify device type and characteristics
 */
function detectDeviceFromUA(userAgent) {
    if (!userAgent) return { type: 'desktop', isMobileUA: false, isTabletUA: false, osHint: 'unknown', browserHint: 'other' };

    const ua = userAgent.toLowerCase();
    let type = 'desktop';
    let isMobileUA = false;
    let isTabletUA = false;

    // 1. Crawler Detection (Now distinct from desktop)
    const crawlerPattern = /googlebot|bingbot|slurp|duckduckbot|baiduspider|yandexbot/i;
    
    // 2. Device Patterns
    const tabletPattern = /ipad|android(?!.*mobile)|kindle|silk|playbook|tablet/i;
    const mobilePattern = /android|iphone|ipod|blackberry|iemobile|opera mini|windows phone|mobile/i;

    if (crawlerPattern.test(ua)) {
        type = 'bot';
    } else if (tabletPattern.test(ua)) {
        type = 'tablet';
        isTabletUA = true;
    } else if (mobilePattern.test(ua)) {
        type = 'mobile';
        isMobileUA = true;
    }

    // OS Hints
    let osHint = 'unknown';
    if (ua.includes('android')) osHint = 'android';
    else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) osHint = 'ios';
    else if (ua.includes('windows')) osHint = 'windows';
    else if (ua.includes('macintosh')) osHint = 'mac';
    else if (ua.includes('linux')) osHint = 'linux';

    // Browser Hints
    let browserHint = 'other';
    if (ua.includes('edg/')) browserHint = 'edge';
    else if (ua.includes('chrome')) browserHint = 'chrome';
    else if (ua.includes('safari') && !ua.includes('chrome')) browserHint = 'safari';
    else if (ua.includes('firefox')) browserHint = 'firefox';

    return {
        type,
        isMobileUA,
        isTabletUA,
        osHint,
        browserHint
    };
}

/**
 * PART 2 — Express middleware
 * Attaches device info to request and sets response header
 */
const deviceMiddleware = (req, res, next) => {
    const userAgent = req.headers['user-agent'] || req.get?.('User-Agent') || '';
    const deviceInfo = detectDeviceFromUA(userAgent);
    
    req.deviceType = deviceInfo.type;
    req.deviceInfo = deviceInfo;

    // Set custom header for frontend validation
    res.setHeader('X-Device-Type', deviceInfo.type);
    
    next();
};

/**
 * PART 3 — Firebase HTTPS callable function wrapper
 * Enriches data with device context from the raw request
 */
const addDeviceContext = (data, context) => {
    // Robust UA extraction for different Firebase Function versions/types
    const userAgent = (context.rawRequest ? context.rawRequest.headers['user-agent'] : context.instanceIdToken) || '';
    const { type, isMobileUA, isTabletUA, osHint } = detectDeviceFromUA(userAgent);

    return {
        ...data,
        _device: {
            type,
            isMobileUA,
            isTabletUA,
            osHint
        }
    };
};

module.exports = {
    detectDeviceFromUA,
    deviceMiddleware,
    addDeviceContext
};
