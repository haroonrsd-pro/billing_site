import { useState, useEffect } from 'react';

export const useDeviceType = () => {
    const [deviceType, setDeviceType] = useState('desktop');

    useEffect(() => {
        const handleResize = () => {
            const width = window.innerWidth;
            if (width < 768) {
                setDeviceType('mobile');
            } else if (width >= 768 && width <= 1024) {
                setDeviceType('tablet');
            } else {
                setDeviceType('desktop');
            }
        };

        handleResize(); // Initial check
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return deviceType;
};
