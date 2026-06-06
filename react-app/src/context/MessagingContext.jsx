import React, { createContext, useContext, useState, useCallback } from 'react';
import ToastNotification from '../components/ToastNotification';
import ConfirmModal from '../components/ConfirmModal';

const MessagingContext = createContext(null);

export const useMessaging = () => {
    const context = useContext(MessagingContext);
    if (!context) throw new Error('useMessaging must be used within a MessagingProvider');
    return context;
};

export function MessagingProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const [modal, setModal] = useState({ isOpen: false });

    const showToast = useCallback((message, type = 'success', duration = 3000) => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const showConfirm = useCallback(({ title, message, onConfirm, onCancel, confirmText, cancelText, type }) => {
        setModal({
            isOpen: true,
            title,
            message,
            confirmText,
            cancelText,
            type,
            onConfirm: () => {
                onConfirm?.();
                setModal(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
                onCancel?.();
                setModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    }, []);

    return (
        <MessagingContext.Provider value={{ showToast, showConfirm }}>
            {children}
            
            {/* Toast Container */}
            <div style={{ 
                position: 'fixed', 
                top: '1.5rem', 
                right: window.innerWidth <= 768 ? '50%' : '1.5rem',
                transform: window.innerWidth <= 768 ? 'translateX(50%)' : 'none',
                zIndex: 11000, 
                padding: '0 1rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.75rem',
                width: window.innerWidth <= 768 ? '100%' : 'auto',
                alignItems: 'center'
            }}>
                {toasts.map(toast => (
                    <ToastNotification 
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onDismiss={() => removeToast(toast.id)}
                    />
                ))}
            </div>

            {/* Global Confirm Modal */}
            <ConfirmModal 
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                onCancel={modal.onCancel}
                confirmText={modal.confirmText}
                cancelText={modal.cancelText}
                type={modal.type}
            />
        </MessagingContext.Provider>
    );
}
