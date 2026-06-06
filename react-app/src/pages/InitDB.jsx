import React, { useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function InitDB() {
    const [status, setStatus] = useState('Idle');
    const navigate = useNavigate();

    const initializeDatabase = async () => {
        setStatus('Initializing...');
        try {
            // Seed Owner
            await setDoc(doc(db, 'roles', 'owner'), {
                user: 'admin',
                passcode: 'sanjay123'
            });

            // Seed Default Admin (Primary Branch)
            await setDoc(doc(db, 'users', 'seed-admin'), {
                name: 'System Administrator',
                username: 'AD-007',
                password: 'sanjay123',
                role: 'admin',
                status: 'active',
                isApproved: true,
                station: 'Main Branch'
            });

            // Seed Staff (Shared Master Pin concept)
            await setDoc(doc(db, 'roles', 'staff'), {
                masterPin: '1234'
            });

            // Seed Super Admin in Firestore
            await setDoc(doc(db, 'users', 'superadmin_main'), {
                name: 'Master Control',
                email: 'superadmin@gmail.com',
                password: 'system@789',
                role: 'superadmin',
                status: 'approved',
                isApproved: true,
                station: 'Global HQ',
                createdAt: new Date().toISOString()
            });

            // Provision Super Admin in Firebase Auth
            try {
                await createUserWithEmailAndPassword(auth, 'superadmin@gmail.com', 'system@789');
            } catch (authError) {
                if (authError.code === 'auth/email-already-in-use') {
                    console.log("Super Admin already exists in Auth.");
                } else {
                    throw authError;
                }
            }

            setStatus('Success! All system profiles initialized.');
            setTimeout(() => {
                navigate('/role-select');
            }, 3000);
        } catch (error) {
            console.error("Error initializing DB:", error);
            setStatus(`Error: ${error.message}`);
        }
    };

    return (
        <div style={{ padding: '3rem', color: '#fff', background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <h1 style={{ marginBottom: '1rem', fontFamily: 'Yeseva One, serif' }}>Database Initialization</h1>
            <p style={{ marginBottom: '2rem', color: '#a3a3a3' }}>Click the button below to pre-fill your Firebase Firestore database with the default roles and passwords.</p>

            <button
                onClick={initializeDatabase}
                style={{ padding: '1rem 2rem', background: '#e85d04', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
                Initialize Roles
            </button>

            <div style={{ marginTop: '2rem', fontSize: '1.2rem', fontWeight: 'bold', color: status.includes('Error') ? '#ef4444' : '#22c55e' }}>
                Status: {status}
            </div>
        </div>
    );
}
