import React from 'react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) {
    if (!isOpen) return null;

    const isDanger = type === 'danger';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem', background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)', animation: 'fadeIn 0.2s ease-out'
        }}>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
            `}</style>
            
            <div style={{
                background: '#1a120f', border: '1px solid rgba(255,255,255,0.1)',
                width: '100%', maxWidth: '420px', borderRadius: '24px',
                padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                animation: 'scaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                position: 'relative'
            }}>
                <div style={{ 
                    width: '56px', height: '56px', borderRadius: '18px',
                    background: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(232, 93, 4, 0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '1.5rem'
                }}>
                    {isDanger ? <AlertTriangle color="#ef4444" size={28} /> : <Info color="#e85d04" size={28} />}
                </div>

                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', marginBottom: '0.75rem', fontFamily: 'Yeseva One, serif' }}>
                    {title}
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: '2rem', fontSize: '0.95rem' }}>
                    {message}
                </p>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button 
                        onClick={onCancel}
                        style={{
                            flex: 1, padding: '0.85rem', borderRadius: '14px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontWeight: 700, cursor: 'pointer', outline: 'none'
                        }}
                    >
                        {cancelText}
                    </button>
                    <button 
                        onClick={onConfirm}
                        style={{
                            flex: 1, padding: '0.85rem', borderRadius: '14px',
                            background: isDanger ? '#ef4444' : '#e85d04', border: 'none',
                            color: '#fff', fontWeight: 700, cursor: 'pointer', outline: 'none',
                            boxShadow: isDanger ? '0 8px 16px rgba(239, 68, 68, 0.2)' : '0 8px 16px rgba(232, 93, 4, 0.2)'
                        }}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
