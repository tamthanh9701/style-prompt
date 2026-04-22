'use client';

import React, { useState } from 'react';
import { signIn } from '@/lib/auth';
import { type Locale, t } from '@/lib/i18n';
import { LogIn } from 'lucide-react';

interface AuthViewProps {
    locale: Locale;
    onSuccess: () => void;
    showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
}

export default function AuthView({ locale, onSuccess, showToast }: AuthViewProps) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || !password) {
            showToast(locale === 'vi' ? 'Vui lòng nhập email và mật khẩu' : 'Please enter email and password', 'warning');
            return;
        }
        setLoading(true);
        try {
            await signIn(email, password);
            showToast(locale === 'vi' ? 'Đăng nhập thành công' : 'Login successful', 'success');
            onSuccess();
        } catch (err: any) {
            showToast(err.message || 'Login failed', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            minHeight: '100vh', background: 'var(--bg-primary)',
        }}>
            <div style={{
                width: '100%', maxWidth: '380px', padding: '40px',
                background: 'rgba(25, 25, 28, 0.85)',
                backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
            }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '48px', height: '48px', borderRadius: '12px',
                        background: 'linear-gradient(135deg, var(--accent), var(--accent-hover))',
                        marginBottom: '16px',
                    }}>
                        <LogIn size={24} color="#FFF" />
                    </div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                        StyleLibrary
                    </h1>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        {locale === 'vi' ? 'Đăng nhập để tiếp tục' : 'Sign in to continue'}
                    </p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                            Email
                        </label>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="admin@example.com"
                            autoComplete="email"
                            style={{
                                width: '100%', padding: '10px 14px', fontSize: '0.85rem',
                                background: 'var(--surface-2)', border: '1px solid var(--border-default)',
                                borderRadius: '8px', color: 'var(--text-primary)', outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>
                            {locale === 'vi' ? 'Mật khẩu' : 'Password'}
                        </label>
                        <input
                            type="password" value={password} onChange={e => setPassword(e.target.value)}
                            placeholder="••••••••"
                            autoComplete="current-password"
                            style={{
                                width: '100%', padding: '10px 14px', fontSize: '0.85rem',
                                background: 'var(--surface-2)', border: '1px solid var(--border-default)',
                                borderRadius: '8px', color: 'var(--text-primary)', outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="btn btn-primary"
                        style={{
                            width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 600,
                            borderRadius: '8px', marginTop: '8px', cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading
                            ? (locale === 'vi' ? 'Đang đăng nhập...' : 'Signing in...')
                            : (locale === 'vi' ? 'Đăng nhập' : 'Sign In')
                        }
                    </button>
                </form>

                <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '24px' }}>
                    {locale === 'vi' ? 'Liên hệ admin để được cấp tài khoản.' : 'Contact admin to get an account.'}
                </p>
            </div>
        </div>
    );
}
