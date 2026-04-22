'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { type Locale, t } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { UserPlus, Trash2, ShieldCheck, User } from 'lucide-react';

interface UserProfile {
    id: string;
    email: string;
    role: 'admin' | 'user';
    display_name: string | null;
    created_at: string;
}

interface Props {
    locale: Locale;
    showToast: (msg: string, type: 'success' | 'error' | 'warning') => void;
    onBack: () => void;
}

export default function UserManagementView({ locale, showToast, onBack }: Props) {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    // Form state
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
    const [newDisplayName, setNewDisplayName] = useState('');

    const getAuthHeaders = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return {
            'Authorization': `Bearer ${session?.access_token || ''}`,
            'Content-Type': 'application/json',
        };
    };

    const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/manage-users`;

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(edgeFnUrl, { headers });
            const data = await res.json();
            if (data.users) setUsers(data.users);
        } catch (err) {
            showToast('Failed to load users', 'error');
        } finally {
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEmail || !newPassword) {
            showToast(locale === 'vi' ? 'Cần email và mật khẩu' : 'Email and password required', 'warning');
            return;
        }
        setCreating(true);
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(edgeFnUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole, display_name: newDisplayName }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            showToast(locale === 'vi' ? 'Tạo tài khoản thành công' : 'Account created', 'success');
            setNewEmail(''); setNewPassword(''); setNewDisplayName(''); setNewRole('user');
            fetchUsers();
        } catch (err: any) {
            showToast(err.message || 'Failed', 'error');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (userId: string, userEmail: string) => {
        if (!confirm(locale === 'vi' ? `Xóa tài khoản ${userEmail}?` : `Delete account ${userEmail}?`)) return;
        try {
            const headers = await getAuthHeaders();
            const res = await fetch(`${edgeFnUrl}?id=${userId}`, {
                method: 'DELETE', headers,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            showToast(locale === 'vi' ? 'Đã xóa tài khoản' : 'Account deleted', 'success');
            fetchUsers();
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const inputStyle: React.CSSProperties = {
        width: '100%', padding: '8px 12px', fontSize: '0.8rem',
        background: 'var(--surface-2)', border: '1px solid var(--border-default)',
        borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
    };

    return (
        <div style={{ padding: '24px 32px', maxWidth: '720px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <button onClick={onBack} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                    ← {locale === 'vi' ? 'Quay lại' : 'Back'}
                </button>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
                    {locale === 'vi' ? 'Quản lý Tài khoản' : 'User Management'}
                </h2>
            </div>

            {/* Create User Form */}
            <div style={{
                padding: '20px', background: 'var(--surface-1)', borderRadius: '12px',
                border: '1px solid var(--border-subtle)', marginBottom: '24px',
            }}>
                <h3 style={{ margin: '0 0 16px', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <UserPlus size={16} /> {locale === 'vi' ? 'Tạo tài khoản mới' : 'Create New Account'}
                </h3>
                <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="Email" style={inputStyle} />
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder={locale === 'vi' ? 'Mật khẩu' : 'Password'} style={inputStyle} />
                    <input type="text" value={newDisplayName} onChange={e => setNewDisplayName(e.target.value)} placeholder={locale === 'vi' ? 'Tên hiển thị (tùy chọn)' : 'Display name (optional)'} style={inputStyle} />
                    <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'user')} style={{ ...inputStyle, cursor: 'pointer' }}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                    <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" className="btn btn-primary" disabled={creating} style={{ padding: '8px 24px', fontSize: '0.85rem' }}>
                            {creating ? '...' : (locale === 'vi' ? 'Tạo tài khoản' : 'Create Account')}
                        </button>
                    </div>
                </form>
            </div>

            {/* User List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>Loading...</div>
                ) : users.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        {locale === 'vi' ? 'Chưa có tài khoản nào' : 'No accounts found'}
                    </div>
                ) : users.map(u => (
                    <div key={u.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 16px', background: 'var(--surface-1)', borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {u.role === 'admin'
                                ? <ShieldCheck size={18} style={{ color: 'var(--accent)' }} />
                                : <User size={18} style={{ color: 'var(--text-muted)' }} />
                            }
                            <div>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    {u.display_name || u.email}
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {u.email} · {u.role.toUpperCase()} · {new Date(u.created_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDelete(u.id, u.email)}
                            style={{
                                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', padding: '6px', borderRadius: '6px',
                            }}
                            title={locale === 'vi' ? 'Xóa' : 'Delete'}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
