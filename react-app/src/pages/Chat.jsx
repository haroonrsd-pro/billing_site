import React, { useState, useEffect, useRef } from 'react';
import { useFirestore } from '../hooks/useFirestore';
import { Send } from 'lucide-react';

export default function Chat() {
    const { docs: messages, addDocument } = useFirestore('messages');
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    const userRole = sessionStorage.getItem('fb_user_role') || 'unknown';
    const userBranch = sessionStorage.getItem('fb_user_station') || 'Main Branch';
    const userName = sessionStorage.getItem('fb_user_name') || userRole;

    const [activeChannel, setActiveChannel] = useState(
        userRole === 'staff' ? `branch_${userBranch}` : 'owner_admin'
    );

    // Auto-scroll to latest message and clear notification count
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        sessionStorage.setItem('lastChatVisit', Date.now().toString());
    }, [messages, activeChannel]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        try {
            await addDocument({
                text: newMessage,
                senderRole: userRole,
                senderName: userName,
                channel: activeChannel,
                timestamp: new Date().toISOString()
            });
            setNewMessage('');
        } catch (err) {
            console.error("Failed to send message", err);
        }
    };

    // Filter messages by active channel
    // Legacy messages without a 'channel' field might be visible everywhere or hidden. Let's show them only in owner_admin.
    const filteredMessages = messages.filter(msg => {
        if (!msg.channel) return activeChannel === 'owner_admin'; // legacy fallback
        return msg.channel === activeChannel;
    });

    // Sort messages by creation time
    const sortedMessages = [...filteredMessages].sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));

    return (
        <div className="page active" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', padding: '0', background: '#f8fafc' }}>
            <div className="pg-header" style={{ padding: '1.5rem', background: '#fff', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>💬</span>
                        <div>
                            <div className="pg-title" style={{ fontSize: '1.3rem', marginBottom: '0' }}>Team Chat</div>
                            <div className="pg-sub" style={{ margin: '0' }}>
                                {activeChannel === 'owner_admin' ? 'Owner & Admins Communication' : `Branch: ${userBranch}`}
                            </div>
                        </div>
                    </div>
                    
                    {userRole === 'admin' && (
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--panel)', padding: '0.5rem', borderRadius: '12px' }}>
                            <button 
                                onClick={() => setActiveChannel('owner_admin')}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '8px', 
                                    border: 'none',
                                    background: activeChannel === 'owner_admin' ? '#6366f1' : 'transparent',
                                    color: activeChannel === 'owner_admin' ? '#fff' : 'var(--muted)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Owner Chat
                            </button>
                            <button 
                                onClick={() => setActiveChannel(`branch_${userBranch}`)}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '8px', 
                                    border: 'none',
                                    background: activeChannel === `branch_${userBranch}` ? '#6366f1' : 'transparent',
                                    color: activeChannel === `branch_${userBranch}` ? '#fff' : 'var(--muted)',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                Branch Staff
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {sortedMessages.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--muted)' }}>
                        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>💭</div>
                        <div>No messages yet. Start the conversation!</div>
                    </div>
                ) : (
                    sortedMessages.map((msg) => {
                        const isMine = msg.senderName === userName && msg.senderRole === userRole;
                        return (
                            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--muted)', marginBottom: '0.2rem', textTransform: 'capitalize' }}>
                                    {msg.senderName || msg.senderRole} {msg.senderRole && `(${msg.senderRole})`}
                                </div>
                                <div style={{
                                    maxWidth: '70%',
                                    padding: '0.8rem 1rem',
                                    borderRadius: isMine ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                    background: isMine ? '#6366f1' : '#fff',
                                    color: isMine ? '#fff' : 'var(--ink)',
                                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                                    border: isMine ? 'none' : '1px solid var(--border)'
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '1.5rem', background: '#fff', borderTop: '1px solid var(--border)' }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message here..."
                        style={{
                            flex: 1,
                            padding: '0.8rem 1rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border)',
                            outline: 'none',
                            background: 'var(--panel)'
                        }}
                    />
                    <button type="submit" className="btn btn-primary" style={{ borderRadius: '12px', padding: '0 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span>Send</span>
                        <Send size={16} />
                    </button>
                </form>
            </div>
        </div>
    );
}
