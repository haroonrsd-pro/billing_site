import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function ToastNotification({ message, type = 'success', duration = 3000, onDismiss }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            handleDismiss();
        }, duration);
        return () => clearTimeout(timer);
    }, [duration]);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade-out animation
    };

    const icons = {
        success: <CheckCircle2 size={18} color="#10b981" />,
        error: <AlertCircle size={18} color="#ef4444" />,
        info: <Info size={18} color="#3b82f6" />
    };

    const backgrounds = {
        success: 'rgba(16, 185, 129, 0.1)',
        error: 'rgba(239, 68, 68, 0.1)',
        info: 'rgba(59, 130, 246, 0.1)'
    };

    const borders = {
        success: 'rgba(16, 185, 129, 0.2)',
        error: 'rgba(239, 68, 68, 0.2)',
        info: 'rgba(59, 130, 246, 0.2)'
    };

    return (
        <div style={{
            position: 'relative', 
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            padding: '1rem 1.25rem', borderRadius: '16px',
            background: 'rgba(26, 18, 15, 0.95)', backdropFilter: 'blur(12px)',
            border: `1px solid ${borders[type] || borders.info}`,
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
            color: '#fff', fontSize: '0.9rem', fontWeight: 600,
            transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
            opacity: isVisible ? 1 : 0,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            width: '100%', maxWidth: '350px'
        }}>
            <div style={{
                width: '32px', height: '32px', borderRadius: '10px',
                background: backgrounds[type] || backgrounds.info,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {icons[type] || icons.info}
            </div>
            
            <div style={{ flex: 1 }}>{message}</div>
            
            <button 
                onClick={handleDismiss}
                style={{
                    background: 'rgba(255,255,255,0.05)', border: 'none', 
                    padding: '8px', borderRadius: '10px',
                    cursor: 'pointer', display: 'flex', color: '#fff',
                    transition: '0.2s', alignSelf: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
                <X size={20} />
            </button>
        </div>
    );
}
